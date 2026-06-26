import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Alert, ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import EmptyState from "../components/EmptyState";
import Touchable from "../components/Touchable";
import { useFeedVideos, useSubscribedChannels } from "../features/youtubeFeed/hooks";
import { useSubmitJob, useCacheReadyJob } from "../features/jobs/hooks";
import { isLiveUnsupportedJob } from "../features/jobs/errors";
import { trackFromReadyJob } from "../features/jobs/track";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";
import type { FeedItemWithStatus } from "../features/youtubeFeed/types";
import type { RootStackParamList } from "../app/navigation/types";
import { useState, useEffect } from "react";
import {
  getSubmittedFeedJobs,
  saveSubmittedFeedJob,
  removeSubmittedFeedJob,
  type SubmittedFeedJob,
} from "../features/youtubeFeed/submittedJobsStorage";
import { getFeedProgressLabel } from "../features/jobs/progress";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";

const MINI_PLAYER_HEIGHT = 64;
const BOTTOM_BASE = 24;
type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

export default function FeedScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: channels = [] } = useSubscribedChannels();
  const { data: videos = [], isLoading, error, refetch } = useFeedVideos();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [submittedJobs, setSubmittedJobs] = useState<Record<string, SubmittedFeedJob>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    getSubmittedFeedJobs().then((jobs) => {
      setSubmittedJobs(jobs);
    });
  }, []);

  const submitJob = useSubmitJob();
  const { tracks } = usePlaylist();
  const { playTrack, activeTrack } = usePlayer();

  const filteredVideos = selectedChannel
    ? videos.filter((v) => v.platformSourceId === selectedChannel)
    : videos;

  const handleConvert = async (video: FeedItemWithStatus) => {
    setSubmittingIds((prev) => new Set(prev).add(video.platformItemId));
    try {
      const result = await submitJob.mutateAsync(video.sourceUrl);
      const jobEntry: SubmittedFeedJob = {
        jobId: result.id,
        sourceUrl: video.sourceUrl,
        submittedAt: new Date().toISOString(),
      };
      await saveSubmittedFeedJob(video.platformItemId, jobEntry);
      setSubmittedJobs((prev) => ({ ...prev, [video.platformItemId]: jobEntry }));
    } catch (err: any) {
      Alert.alert(t("common.error"), t("errors.generic"));
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(video.platformItemId);
        return next;
      });
    }
  };

  if (channels.length === 0 && !isLoading) {
    return (
      <Screen>
        <EmptyState
          icon="newspaper-outline"
          title={t("feed.noSubscriptions")}
          description={t("feed.addToBrowse")}
          actionLabel={t("feed.addChannel")}
          onAction={() => navigation.navigate("AddChannel")}
        />
      </Screen>
    );
  }

  return (
    <Screen reserveMiniPlayerSpace={false} scroll={false}>
      {channels.length > 0 && (
        <View style={[styles.pillsRow, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelScroll}>
            <Touchable
              accessibilityRole="button"
              style={[styles.pill, { backgroundColor: colors.elevatedSurface }, !selectedChannel && { backgroundColor: colors.tint }]}
              onPress={() => setSelectedChannel(null)}
            >
              <Text style={[styles.pillText, { color: colors.secondaryText }, !selectedChannel && { color: colors.tintText }]}>{t("feed.all")}</Text>
            </Touchable>
            {channels.map((ch) => (
              <Touchable
                accessibilityRole="button"
                key={ch.platformSourceId}
                style={[styles.pill, { backgroundColor: colors.elevatedSurface }, selectedChannel === ch.platformSourceId && { backgroundColor: colors.tint }]}
                onPress={() => setSelectedChannel(selectedChannel === ch.platformSourceId ? null : ch.platformSourceId)}
              >
                  <Text style={[styles.pillText, { color: colors.secondaryText }, selectedChannel === ch.platformSourceId && { color: colors.tintText }]} numberOfLines={1}>
                  {ch.title}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
          <View style={styles.channelActions}>
            <Touchable
              accessibilityLabel={t("feed.manageChannels")}
              accessibilityRole="button"
              style={[styles.manageButton, { backgroundColor: colors.elevatedSurface }]}
              onPress={() => navigation.navigate("ManageChannels")}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.secondaryText} />
            </Touchable>
            <Touchable
              accessibilityLabel={t("feed.addChannel")}
              accessibilityRole="button"
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => navigation.navigate("AddChannel")}
            >
              <Ionicons name="add" size={24} color={colors.tintText} />
            </Touchable>
          </View>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>{t("feed.loading")}</Text>
        </View>
      )}

      {error && (
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{t("feed.loadFailed")}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={filteredVideos}
          keyExtractor={(v) => v.platformItemId}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              jobId={submittedJobs[item.platformItemId]?.jobId ?? null}
              allTracks={tracks}
              onConvert={handleConvert}
              onPlay={(track) => {
                playTrack(track, tracks);
                navigation.navigate("Player", { jobId: track.jobId });
              }}
              isSubmitting={submittingIds.has(item.platformItemId)}
              onTerminal={(platformItemId: string) => {
                removeSubmittedFeedJob(platformItemId);
                setSubmittedJobs((prev) => {
                  const next = { ...prev };
                  delete next[platformItemId];
                  return next;
                });
              }}
            />
          )}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={<Text style={[styles.emptyFeed, { color: colors.secondaryText }]}>{t("feed.noVideos")}</Text>}
          contentContainerStyle={[styles.listContent, { paddingBottom: activeTrack ? MINI_PLAYER_HEIGHT : BOTTOM_BASE }]}
        />
      )}
    </Screen>
  );
}

function VideoCard({
  video,
  jobId,
  allTracks,
  onConvert,
  onPlay,
  isSubmitting,
  onTerminal,
}: {
  video: FeedItemWithStatus;
  jobId: string | null;
  allTracks: Track[];
  onConvert: (v: FeedItemWithStatus) => void;
  onPlay: (track: Track) => void;
  isSubmitting: boolean;
  onTerminal: (platformItemId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { cacheState, job } = useCacheReadyJob(jobId);
  const track =
    (jobId ? allTracks.find((t) => t.jobId === jobId) : null) ??
    allTracks.find((t) => t.sourceUrl === video.sourceUrl) ??
    null;
  const playableTrack = track ?? (job?.status === "ready" ? trackFromReadyJob(job) : null);
  const liveUnsupported = job?.status === "failed" && isLiveUnsupportedJob(job);

  const status = jobId
    ? track !== null || job?.status === "ready" ? "ready"
    : job?.status === "failed" || job?.status === "expired" ? "failed"
    : "converting"
    : track !== null ? "ready"
    : video.status;

  useEffect(() => {
    if (!jobId) return;
    const isTerminal =
      track !== null ||
      job?.status === "failed" ||
      job?.status === "expired";
    if (isTerminal) {
      onTerminal(video.platformItemId);
    }
  }, [jobId, track, job?.status]);

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <VideoThumbnail thumbnailUrl={video.thumbnailUrl} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={2}>{video.title}</Text>
        <Text style={[styles.cardMeta, { color: colors.secondaryText }]}>{video.sourceTitle} · {formatRelativeTime(video.publishedAt, t)}</Text>
        {status === "converting" && (
          <View style={styles.inlineStatus}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.phaseLabel, { color: colors.tint }]} numberOfLines={1}>
            {getFeedProgressLabel(
              job ?? { status: "queued", progressPhase: null, attemptCount: 0, lastErrorMessage: null }
            , t).label}
            </Text>
          </View>
        )}
        {status === "ready" && cacheState === "caching" && <Text style={[styles.cacheLabel, { color: colors.secondaryText }]}>{t("feed.caching")}</Text>}
        {status === "ready" && cacheState === "error" && <Text style={[styles.cacheLabel, { color: colors.destructive }]}>{t("feed.cacheFailed")}</Text>}
        {status === "failed" && liveUnsupported && <Text style={[styles.cacheLabel, { color: colors.destructive }]}>{t("errors.liveUnsupported")}</Text>}
      </View>
      <VideoAction
        disabled={liveUnsupported}
        isSubmitting={isSubmitting}
        onConvert={() => onConvert(video)}
        onPlay={playableTrack ? () => onPlay(playableTrack) : undefined}
        status={status}
        t={t}
      />
    </View>
  );
}

function VideoThumbnail({ thumbnailUrl }: { thumbnailUrl: string | null }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.thumbnail, { backgroundColor: colors.elevatedSurface }]}>
      {thumbnailUrl ? (
        <Image resizeMode="cover" source={{ uri: thumbnailUrl }} style={styles.thumbnailImage} />
      ) : (
        <Ionicons name="play" size={22} color={colors.tint} />
      )}
    </View>
  );
}

function VideoAction({
  status,
  isSubmitting,
  onConvert,
  onPlay,
  t,
  disabled = false,
}: {
  status: "new" | "converting" | "ready" | "failed";
  isSubmitting: boolean;
  onConvert: () => void;
  onPlay?: () => void;
  t: (key: string) => string;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  if (status === "converting" || isSubmitting) {
    return <View accessibilityLabel={t("progress.processing")} accessibilityRole="progressbar" style={styles.actionPlaceholder} />;
  }

  const isReady = status === "ready" && onPlay;
  const icon: IoniconName = isReady ? "play" : status === "failed" ? "refresh" : "arrow-down";
  const label = isReady ? t("common.play") : status === "failed" ? t("common.retry") : t("feed.convert");

  return (
    <Touchable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={isReady ? onPlay : onConvert}
      style={[styles.actionButton, { backgroundColor: status === "failed" ? colors.destructive : colors.tint }, disabled && styles.actionButtonDisabled]}
    >
      <Ionicons name={icon} size={22} color={colors.tintText} />
    </Touchable>
  );
}

function formatRelativeTime(isoDate: string, t: (key: string, options?: { count: number }) => string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return t("feed.ago.minute", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("feed.ago.hour", { count: hours });
  const days = Math.floor(hours / 24);
  return t("feed.ago.day", { count: days });
}

const styles = StyleSheet.create({
  pillsRow: { alignItems: "center", borderBottomColor: "#dbcbb9", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingHorizontal: 18, paddingVertical: 8 },
  channelScroll: { flex: 1 },
  channelActions: { flexDirection: "row", gap: 4, marginLeft: 4 },
  pill: { alignItems: "center", backgroundColor: "#eee6dc", borderRadius: 18, justifyContent: "center", marginRight: 8, minHeight: 36, paddingHorizontal: 14 },
  pillText: { color: "#6f6256", fontSize: 13 },
  addButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 22, height: 44, justifyContent: "center", marginLeft: 4, width: 44 },
  manageButton: { alignItems: "center", backgroundColor: "#eee6dc", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  loadingContainer: { alignItems: "center", flex: 1, justifyContent: "center" },
  loadingText: { color: "#6f6256", fontSize: 15, marginTop: 8 },
  errorText: { color: "#b42318", fontSize: 15 },
  emptyFeed: { color: "#6f6256", marginTop: 40, textAlign: "center" },
  listContent: { paddingHorizontal: 18, paddingTop: 4 },
  card: { alignItems: "center", borderBottomColor: "#e2d7c9", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, minHeight: 84, paddingVertical: 12 },
  thumbnail: { alignItems: "center", aspectRatio: 16 / 9, backgroundColor: "#f1dfc7", borderRadius: 10, justifyContent: "center", overflow: "hidden", width: 84 },
  thumbnailImage: { height: "100%", width: "100%" },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { color: "#241a12", fontSize: 16, fontWeight: "600", lineHeight: 20 },
  cardMeta: { color: "#85776a", fontSize: 13 },
  inlineStatus: { alignItems: "center", flexDirection: "row", gap: 5 },
  phaseLabel: { color: "#8b5c48", flex: 1, fontSize: 12, fontWeight: "600" },
  cacheLabel: { color: "#85776a", fontSize: 12 },
  actionButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  actionButtonDisabled: { opacity: 0.45 },
  actionPlaceholder: { height: 44, width: 44 },
});
