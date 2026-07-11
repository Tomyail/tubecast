import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Linking,
  PanResponder,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Touchable from "../components/Touchable";
import { useTrackAudioExport } from "../features/audioExport/hooks";
import { useCacheReadyJob } from "../features/jobs/hooks";
import { usePlayer, usePlaybackProgress } from "../features/player/context";
import { useRemoteConfig } from "../features/remoteConfig/context";
import { buildShareMessage, buildShareShortUrl, buildTrackShareLandingUrl, buildYouTubeTimestampUrl } from "../features/shareLinks/links";
import { createShareMoment } from "../features/shareLinks/momentsApi";
import { useTranslation } from "../i18n";
import { formatDuration } from "../i18n/formatters";
import { useAppTheme } from "../app/theme";
import { toExpoImageSource } from "../shared/imageSource";
import type { RootStackParamList } from "../app/navigation/types";
import { getDisplayedProgressTime, getProgressXFromPageX, getSeekTimeFromDrag } from "./playerProgress";

type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

export default function PlayerScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    activeTrack,
    isPlaying,
    playbackLoading,
    duration,
    playbackSource,
    playbackError,
    togglePlayback,
    seekTo,
    playNext,
    playPrevious,
  } = usePlayer();
  const currentTime = usePlaybackProgress();
  const { cacheState, retryCache } = useCacheReadyJob(activeTrack?.jobId ?? null);
  const { audioExportEnabled } = useRemoteConfig();
  const { exportingTrackId, exportTrack } = useTrackAudioExport();
  const [progressWidth, setProgressWidth] = useState(1);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [optimisticSeekTime, setOptimisticSeekTime] = useState<number | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const progressRef = useRef<View>(null);
  const progressLeftRef = useRef(0);
  const progressMeasuredRef = useRef(false);
  const scrubStartXRef = useRef(0);
  const scrubTimeRef = useRef<number | null>(null);
  const latestDragDxRef = useRef(0);

  useEffect(() => {
    scrubTimeRef.current = null;
    setScrubTime(null);
    setOptimisticSeekTime(null);
  }, [activeTrack?.id]);

  useEffect(() => {
    if (optimisticSeekTime === null) return;
    if (Math.abs(currentTime - optimisticSeekTime) < 0.75) {
      setOptimisticSeekTime(null);
      return;
    }

    const timeout = setTimeout(() => setOptimisticSeekTime(null), 1200);
    return () => clearTimeout(timeout);
  }, [currentTime, optimisticSeekTime]);

  const previewSeekFromDrag = useCallback((dx: number) => {
    if (duration <= 0) return;
    const seconds = getSeekTimeFromDrag(scrubStartXRef.current, dx, progressWidth, duration);
    scrubTimeRef.current = seconds;
    setScrubTime(seconds);
  }, [duration, progressWidth]);

  const measureProgress = useCallback((onMeasured?: () => void) => {
    progressRef.current?.measureInWindow((x, _y, width) => {
      progressLeftRef.current = x;
      progressMeasuredRef.current = true;
      if (width > 0) setProgressWidth(width);
      onMeasured?.();
    });
  }, []);

  const startScrubFromPageX = useCallback((pageX: number) => {
    const start = () => {
      scrubStartXRef.current = getProgressXFromPageX(pageX, progressLeftRef.current);
      previewSeekFromDrag(latestDragDxRef.current);
    };

    if (progressMeasuredRef.current) {
      start();
      return;
    }

    measureProgress(start);
  }, [measureProgress, previewSeekFromDrag]);

  const commitSeek = useCallback(() => {
    const seconds = scrubTimeRef.current;
    if (seconds !== null && duration > 0) {
      setOptimisticSeekTime(seconds);
      seekTo(seconds);
    }
    scrubTimeRef.current = null;
    setScrubTime(null);
  }, [duration, seekTo]);

  const seekBy = useCallback((seconds: number) => {
    if (duration <= 0) return;
    seekTo(Math.min(duration, Math.max(0, currentTime + seconds)));
  }, [currentTime, duration, seekTo]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => duration > 0,
    onMoveShouldSetPanResponder: () => duration > 0,
    onPanResponderGrant: (event) => {
      latestDragDxRef.current = 0;
      startScrubFromPageX(event.nativeEvent.pageX);
    },
    onPanResponderMove: (_event, gestureState) => {
      latestDragDxRef.current = gestureState.dx;
      if (progressMeasuredRef.current) {
        previewSeekFromDrag(gestureState.dx);
      }
    },
    onPanResponderRelease: commitSeek,
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: commitSeek,
  }), [commitSeek, duration, previewSeekFromDrag, startScrubFromPageX]);

  if (!activeTrack) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <PlayerHeader
          canGoBack={navigation.canGoBack()}
          colors={colors}
          onBack={() => navigation.goBack()}
          title={t("nav.player")}
          backLabel={t("common.back")}
        />
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={36} color={colors.secondaryText} />
          <Text style={[styles.empty, { color: colors.secondaryText }]}>{t("player.noTrack")}</Text>
        </View>
      </View>
    );
  }

  const displayedTime = getDisplayedProgressTime(currentTime, scrubTime, optimisticSeekTime);
  const progress = duration > 0 ? Math.min(1, displayedTime / duration) : 0;
  const remaining = Math.max(0, duration - displayedTime);
  const sourceStatus = getSourceStatus(cacheState, activeTrack.cacheStatus, playbackSource, t);

  const openSource = () => {
    if (isPlaying) void togglePlayback();
    const timestamp = Math.floor(currentTime);
    const separator = activeTrack.sourceUrl.includes("?") ? "&" : "?";
    void Linking.openURL(`${activeTrack.sourceUrl}${separator}t=${timestamp}`);
  };

  const shareTimestamp = async () => {
    const timestamp = Math.floor(currentTime);
    // Mint a short link first (createShareMoment enforces a 3s timeout). On any
    // failure — network, 429, timeout — fall back to the long /share?... URL so
    // sharing never blocks. Show a loader while we wait so the tap feels
    // responsive instead of silently hanging before the share sheet opens.
    setIsPreparingShare(true);
    let landingUrl: string;
    try {
      const { id } = await createShareMoment({
        sourceUrl: activeTrack.sourceUrl,
        t: timestamp,
        title: activeTrack.title ?? undefined,
        channel: activeTrack.channelName ?? undefined,
      });
      landingUrl = buildShareShortUrl(id);
    } catch {
      landingUrl = buildTrackShareLandingUrl(activeTrack, timestamp);
    } finally {
      setIsPreparingShare(false);
    }
    const fallbackUrl = buildYouTubeTimestampUrl(activeTrack.sourceUrl, timestamp);
    const message = buildShareMessage(activeTrack, landingUrl, fallbackUrl);

    try {
      await Share.share({ message, url: landingUrl, title: activeTrack.title || t("common.untitled") });
    } catch {
      Alert.alert(t("share.failedTitle"), t("share.failedMessage"));
    }
  };

  const showActions = () => {
    if (!audioExportEnabled) {
      void shareTimestamp();
      return;
    }

    const shareAction = () => void shareTimestamp();
    const exportAction = () => void exportTrack(activeTrack);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("share.moment"), t("audioExport.action"), t("common.cancel")],
          cancelButtonIndex: 2,
          title: activeTrack.title || t("common.untitled"),
        },
        (buttonIndex) => {
          if (buttonIndex === 0) shareAction();
          if (buttonIndex === 1) exportAction();
        },
      );
      return;
    }

    Alert.alert(t("player.actions"), undefined, [
      { text: t("share.moment"), onPress: shareAction },
      { text: t("audioExport.action"), onPress: exportAction },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const isHeaderActionBusy = isPreparingShare || exportingTrackId === activeTrack.id;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PlayerHeader
        canGoBack={navigation.canGoBack()}
        colors={colors}
        onBack={() => navigation.goBack()}
        rightAction={
          <Touchable
            accessibilityLabel={isPreparingShare ? t("share.preparing") : audioExportEnabled ? t("player.actions") : t("share.moment")}
            accessibilityRole="button"
            disabled={isHeaderActionBusy}
            hitSlop={8}
            onPress={showActions}
            style={[styles.headerIconButton, { backgroundColor: colors.elevatedSurface }, isHeaderActionBusy && styles.headerIconButtonDisabled]}
          >
            {isHeaderActionBusy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Ionicons name={audioExportEnabled ? "ellipsis-horizontal" : "share-outline"} size={audioExportEnabled ? 24 : 23} color={colors.primaryText} />
            )}
          </Touchable>
        }
        title={t("nav.player")}
        backLabel={t("common.back")}
      />
      <View style={styles.container}>
        <View style={styles.trackHeader}>
          <View style={[styles.artwork, { backgroundColor: colors.elevatedSurface }]}>
            {activeTrack.thumbnailUrl ? (
              <Image source={toExpoImageSource(activeTrack.thumbnailUrl)} style={styles.artworkImage} contentFit="cover" transition={300} />
            ) : (
              <Ionicons name="musical-note" size={44} color={colors.tint} />
            )}
          </View>

          <Touchable
            accessibilityHint={t("player.openSource")}
            accessibilityLabel={activeTrack.title || t("common.untitled")}
            accessibilityRole="link"
            onPress={openSource}
            style={styles.titleBlock}
          >
            <Text numberOfLines={3} style={[styles.title, { color: colors.primaryText }]}>{activeTrack.title || t("common.untitled")}</Text>
            <View style={styles.sourceLink}>
              <Ionicons name="link-outline" size={14} color={colors.tint} />
              <Text numberOfLines={1} style={[styles.sourceUrl, { color: colors.tint }]}>{t("player.source")}</Text>
            </View>
          </Touchable>

          {activeTrack.channelId ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t("player.publisher")}
              onPress={() => navigation.navigate("PublisherPreview", {
                channelId: activeTrack.channelId!,
                channelName: activeTrack.channelName,
              })}
              style={styles.publisherRow}
            >
              <View style={[styles.publisherAvatar, { backgroundColor: colors.elevatedSurface }]}>
                <Text style={[styles.publisherAvatarText, { color: colors.tint }]}>
                  {(activeTrack.channelName ?? activeTrack.channelId).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.publisherName, { color: colors.primaryText }]}>
                {activeTrack.channelName ?? activeTrack.channelId}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
            </Touchable>
          ) : null}
        </View>

        <View style={[styles.statusPill, { backgroundColor: sourceStatus.variant === "error" ? colors.destructiveSurface : colors.elevatedSurface }]}>
          <Ionicons name={sourceStatus.icon} size={15} color={sourceStatus.variant === "error" ? colors.destructive : colors.secondaryText} />
          <Text style={[styles.statusText, { color: sourceStatus.variant === "error" ? colors.destructive : colors.secondaryText }]}>{sourceStatus.label}</Text>
        </View>

        {playbackError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{playbackError}</Text> : null}
        {cacheState === "error" ? (
          <Touchable accessibilityRole="button" onPress={retryCache} style={styles.retryCacheButton}>
            <Text style={[styles.retryCacheText, { color: colors.tint }]}>{t("player.retryCache")}</Text>
          </Touchable>
        ) : null}

        <View style={styles.playbackArea}>
          <View
            accessible
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            accessibilityLabel={t("player.seek")}
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 0, now: Math.round(displayedTime), max: Math.round(duration) }}
            onAccessibilityAction={(event) => seekBy(event.nativeEvent.actionName === "increment" ? 15 : -15)}
            ref={progressRef}
            onLayout={(event) => {
              setProgressWidth(event.nativeEvent.layout.width);
              measureProgress();
            }}
            style={styles.progressTouchTarget}
            {...panResponder.panHandlers}
          >
            <View style={[styles.progressRail, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { backgroundColor: colors.tint, borderColor: colors.surface, left: `${progress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.secondaryText }]}>{playbackLoading ? t("player.loading") : formatDuration(displayedTime)}</Text>
            <Text style={[styles.time, { color: colors.secondaryText }]}>{duration > 0 ? `-${formatDuration(remaining)}` : "--:--"}</Text>
          </View>

          <View style={styles.controls}>
            <Touchable
              accessibilityLabel={t("player.previous")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={playPrevious}
              style={styles.controlButton}
            >
              <Ionicons name="play-skip-back" size={30} color={colors.primaryText} />
            </Touchable>
            <Touchable
              accessibilityLabel={playbackLoading ? t("player.loading") : isPlaying ? t("common.pause") : t("common.play")}
              accessibilityRole="button"
              disabled={playbackLoading}
              onPress={() => void togglePlayback()}
              style={[styles.primaryControl, { backgroundColor: colors.tint }, playbackLoading && styles.primaryControlDisabled]}
            >
              {playbackLoading ? (
                <ActivityIndicator color={colors.tintText} />
              ) : (
                <Ionicons name={isPlaying ? "pause" : "play"} size={35} color={colors.tintText} />
              )}
            </Touchable>
            <Touchable
              accessibilityLabel={t("player.next")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={playNext}
              style={styles.controlButton}
            >
              <Ionicons name="play-skip-forward" size={30} color={colors.primaryText} />
            </Touchable>
          </View>
        </View>
      </View>
    </View>
  );
}

function PlayerHeader({
  backLabel,
  canGoBack,
  colors,
  onBack,
  rightAction,
  title,
}: {
  backLabel: string;
  canGoBack: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onBack: () => void;
  rightAction?: ReactNode;
  title: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {canGoBack ? (
          <Touchable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={[styles.backButton, { backgroundColor: colors.elevatedSurface }]}
          >
            <Ionicons name="chevron-down" size={30} color={colors.primaryText} />
          </Touchable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.primaryText }]}>
          {title}
        </Text>
        {rightAction ?? <View style={styles.backButtonPlaceholder} />}
      </View>
    </View>
  );
}

function getSourceStatus(
  cacheState: "idle" | "caching" | "cached" | "error",
  cacheStatus: "none" | "caching" | "cached" | "failed",
  playbackSource: "local" | "remote" | null,
  t: (key: string) => string,
): { label: string; icon: IoniconName; variant: "default" | "error" } {
  if (cacheState === "caching") return { label: t("player.caching"), icon: "cloud-download-outline", variant: "default" };
  if (cacheState === "error" || cacheStatus === "failed") return { label: t("player.cacheFailed"), icon: "alert-circle-outline", variant: "error" };
  if (cacheStatus === "cached" || playbackSource === "local") return { label: t("player.cached"), icon: "cloud-done-outline", variant: "default" };
  if (playbackSource === "remote") return { label: t("player.streaming"), icon: "link-outline", variant: "default" };
  return { label: t("player.notCached"), icon: "cloud-offline-outline", variant: "default" };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff9f3",
  },
  headerContent: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  backButtonPlaceholder: {
    height: 56,
    width: 56,
  },
  headerIconButton: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  headerIconButtonDisabled: { opacity: 0.65 },
  headerTitle: {
    color: "#241a12",
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  empty: { color: "#6f6256", fontSize: 17, textAlign: "center" },
  trackHeader: { alignItems: "center", gap: 18 },
  artwork: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: "#f1dfc7",
    borderRadius: 18,
    justifyContent: "center",
    maxWidth: 320,
    overflow: "hidden",
    width: "100%",
  },
  artworkImage: { height: "100%", width: "100%" },
  titleBlock: { alignItems: "center", gap: 8, width: "100%" },
  title: { color: "#241a12", fontSize: 22, fontWeight: "700", lineHeight: 28, textAlign: "center" },
  sourceLink: { alignItems: "center", flexDirection: "row", gap: 5, maxWidth: "100%" },
  sourceUrl: { color: "#8b5c48", fontSize: 13, maxWidth: "90%" },
  publisherRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4, maxWidth: "100%" },
  publisherAvatar: { alignItems: "center", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  publisherAvatarText: { fontSize: 13, fontWeight: "700" },
  publisherName: { flex: 1, fontSize: 14, fontWeight: "500" },
  statusPill: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: { color: "#6f6256", fontSize: 13, fontWeight: "600" },
  errorText: { color: "#b42318", fontSize: 14, marginTop: 10, textAlign: "center" },
  retryCacheButton: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 10 },
  retryCacheText: { color: "#8b5c48", fontSize: 15, fontWeight: "600" },
  playbackArea: { gap: 10, paddingBottom: 18 },
  progressTouchTarget: { height: 64, justifyContent: "center", width: "100%" },
  progressRail: { backgroundColor: "#ded0c1", borderRadius: 3, height: 6, position: "relative", width: "100%" },
  progressFill: { backgroundColor: "#b65a36", borderRadius: 3, height: 6 },
  progressThumb: {
    backgroundColor: "#b65a36",
    borderColor: "#fff9f3",
    borderRadius: 9,
    borderWidth: 3,
    height: 18,
    marginLeft: -9,
    marginTop: -6,
    position: "absolute",
    top: 0,
    width: 18,
  },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "#6f6256", fontSize: 13, fontVariant: ["tabular-nums"] },
  controls: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 18 },
  controlButton: { alignItems: "center", height: 56, justifyContent: "center", width: 56 },
  primaryControl: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  primaryControlDisabled: { opacity: 0.65 },
});
