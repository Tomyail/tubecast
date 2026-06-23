import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Screen from "../components/Screen";
import { useCacheReadyJob } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";
import { useTranslation } from "../i18n";
import { formatDuration } from "../i18n/formatters";

type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

export default function PlayerScreen() {
  const { t } = useTranslation();
  const {
    activeTrack,
    isPlaying,
    playbackLoading,
    currentTime,
    duration,
    playbackSource,
    playbackError,
    togglePlayback,
    seekTo,
    playNext,
    playPrevious,
  } = usePlayer();
  const { cacheState, retryCache } = useCacheReadyJob(activeTrack?.jobId ?? null);
  const [progressWidth, setProgressWidth] = useState(1);

  const seekFromX = useCallback((x: number) => {
    if (duration <= 0) return;
    const percentage = Math.min(1, Math.max(0, x / progressWidth));
    seekTo(percentage * duration);
  }, [duration, progressWidth, seekTo]);

  const seekBy = useCallback((seconds: number) => {
    if (duration <= 0) return;
    seekTo(Math.min(duration, Math.max(0, currentTime + seconds)));
  }, [currentTime, duration, seekTo]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => duration > 0,
    onMoveShouldSetPanResponder: () => duration > 0,
    onPanResponderGrant: (event) => seekFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => seekFromX(event.nativeEvent.locationX),
  }), [duration, seekFromX]);

  if (!activeTrack) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={36} color="#8b7d70" />
          <Text style={styles.empty}>{t("player.noTrack")}</Text>
        </View>
      </Screen>
    );
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const remaining = Math.max(0, duration - currentTime);
  const sourceStatus = getSourceStatus(cacheState, activeTrack.cacheStatus, playbackSource, t);

  const openSource = () => {
    if (isPlaying) void togglePlayback();
    const timestamp = Math.floor(currentTime);
    const separator = activeTrack.sourceUrl.includes("?") ? "&" : "?";
    void Linking.openURL(`${activeTrack.sourceUrl}${separator}t=${timestamp}`);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.trackHeader}>
          <View style={styles.artwork}>
            {activeTrack.thumbnailUrl ? (
              <Image resizeMode="cover" source={{ uri: activeTrack.thumbnailUrl }} style={styles.artworkImage} />
            ) : (
              <Ionicons name="musical-note" size={44} color="#b65a36" />
            )}
          </View>

          <Pressable
            accessibilityHint={t("player.openSource")}
            accessibilityLabel={activeTrack.title || t("common.untitled")}
            accessibilityRole="link"
            onPress={openSource}
            style={styles.titleBlock}
          >
            <Text numberOfLines={3} style={styles.title}>{activeTrack.title || t("common.untitled")}</Text>
            <View style={styles.sourceLink}>
              <Ionicons name="link-outline" size={14} color="#8b5c48" />
              <Text numberOfLines={1} style={styles.sourceUrl}>{activeTrack.sourceUrl}</Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.statusPill, sourceStatus.variant === "error" && styles.statusPillError]}>
          <Ionicons name={sourceStatus.icon} size={15} color={sourceStatus.variant === "error" ? "#b42318" : "#6f6256"} />
          <Text style={[styles.statusText, sourceStatus.variant === "error" && styles.statusTextError]}>{sourceStatus.label}</Text>
        </View>

        {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
        {cacheState === "error" ? (
          <Pressable accessibilityRole="button" onPress={retryCache} style={styles.retryCacheButton}>
            <Text style={styles.retryCacheText}>{t("player.retryCache")}</Text>
          </Pressable>
        ) : null}

        <View style={styles.playbackArea}>
          <View
            accessible
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            accessibilityLabel={t("player.seek")}
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 0, now: Math.round(currentTime), max: Math.round(duration) }}
            onAccessibilityAction={(event) => seekBy(event.nativeEvent.actionName === "increment" ? 15 : -15)}
            onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
            style={styles.progressTouchTarget}
            {...panResponder.panHandlers}
          >
            <View style={styles.progressRail}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.time}>{playbackLoading ? t("player.loading") : formatDuration(currentTime)}</Text>
            <Text style={styles.time}>{duration > 0 ? `-${formatDuration(remaining)}` : "--:--"}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityLabel={t("player.previous")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={playPrevious}
              style={styles.controlButton}
            >
              <Ionicons name="play-skip-back" size={30} color="#3f3026" />
            </Pressable>
            <Pressable
              accessibilityLabel={isPlaying ? t("common.pause") : t("common.play")}
              accessibilityRole="button"
              disabled={playbackLoading}
              onPress={() => void togglePlayback()}
              style={[styles.primaryControl, playbackLoading && styles.primaryControlDisabled]}
            >
              {playbackLoading ? (
                <ActivityIndicator color="#fff9f3" />
              ) : (
                <Ionicons name={isPlaying ? "pause" : "play"} size={35} color="#fff9f3" />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={t("player.next")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={playNext}
              style={styles.controlButton}
            >
              <Ionicons name="play-skip-forward" size={30} color="#3f3026" />
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
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
  statusPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#eee6dc",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPillError: { backgroundColor: "#fde8e7" },
  statusText: { color: "#6f6256", fontSize: 13, fontWeight: "600" },
  statusTextError: { color: "#b42318" },
  errorText: { color: "#b42318", fontSize: 14, marginTop: 10, textAlign: "center" },
  retryCacheButton: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 10 },
  retryCacheText: { color: "#8b5c48", fontSize: 15, fontWeight: "600" },
  playbackArea: { gap: 10, paddingBottom: 18 },
  progressTouchTarget: { height: 44, justifyContent: "center", width: "100%" },
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
