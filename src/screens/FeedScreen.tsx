import { Alert, ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { useFeedVideos, useSubscribedChannels, useRemoveChannel } from "../features/youtubeFeed/hooks";
import { useSubmitJob, useCacheReadyJob } from "../features/jobs/hooks";
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
import AddChannelScreen from "./AddChannelScreen";

const BOTTOM_WITH_PLAYER = 120;
const BOTTOM_BASE = 24;

export default function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: channels = [] } = useSubscribedChannels();
  const { data: videos = [], isLoading, error, refetch } = useFeedVideos();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [submittedJobs, setSubmittedJobs] = useState<Record<string, SubmittedFeedJob>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    getSubmittedFeedJobs().then((jobs) => {
      setSubmittedJobs(jobs);
    });
  }, []);

  const removeChannel = useRemoveChannel();
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
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(video.platformItemId);
        return next;
      });
    }
  };

  const handleRemoveChannel = (channelId: string) => {
    Alert.alert("Remove Channel", "Remove this channel from your subscriptions?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeChannel.mutate(channelId) },
    ]);
  };

  if (showAddChannel) {
    return (
      <AddChannelScreen
        onAdded={() => setShowAddChannel(false)}
        onClose={() => setShowAddChannel(false)}
      />
    );
  }

  if (channels.length === 0 && !isLoading) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Subscriptions</Text>
          <Text style={styles.emptyText}>Add a YouTube channel to start browsing.</Text>
          <Pressable style={styles.addChannelButton} onPress={() => setShowAddChannel(true)}>
            <Text style={styles.addChannelButtonText}>+ Add Channel</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      {channels.length > 0 && (
        <View style={styles.pillsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              style={[styles.pill, !selectedChannel && styles.pillActive]}
              onPress={() => setSelectedChannel(null)}
            >
              <Text style={[styles.pillText, !selectedChannel && styles.pillTextActive]}>All</Text>
            </Pressable>
            {channels.map((ch) => (
              <Pressable
                key={ch.platformSourceId}
                style={[styles.pill, selectedChannel === ch.platformSourceId && styles.pillActive]}
                onPress={() => setSelectedChannel(selectedChannel === ch.platformSourceId ? null : ch.platformSourceId)}
                onLongPress={() => handleRemoveChannel(ch.platformSourceId)}
              >
                <Text style={[styles.pillText, selectedChannel === ch.platformSourceId && styles.pillTextActive]} numberOfLines={1}>
                  {ch.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.addButton} onPress={() => setShowAddChannel(true)}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      )}

      {error && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load feed. Pull down to retry.</Text>
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
          ListEmptyComponent={<Text style={styles.emptyFeed}>No videos found</Text>}
          contentContainerStyle={[styles.listContent, { paddingBottom: activeTrack ? BOTTOM_WITH_PLAYER : BOTTOM_BASE }]}
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
  const { cacheState, job } = useCacheReadyJob(jobId);
  const track =
    (jobId ? allTracks.find((t) => t.jobId === jobId) : null) ??
    allTracks.find((t) => t.sourceUrl === video.sourceUrl) ??
    null;
  const playableTrack = track ?? (job?.status === "ready" ? trackFromReadyJob(job) : null);

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
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.cardMeta}>{video.sourceTitle} · {formatRelativeTime(video.publishedAt)}</Text>
      </View>
      {status === "new" && (
        <Pressable
          style={[styles.actionButton, styles.convertButton, isSubmitting && styles.disabled]}
          onPress={() => onConvert(video)}
          disabled={isSubmitting}
        >
          <Text style={styles.actionText}>Convert</Text>
        </Pressable>
      )}
      {status === "converting" && (
        <View style={styles.actionButton}>
          <Text style={styles.phaseLabel}>
            {getFeedProgressLabel(
              job ?? { status: "queued", progressPhase: null, attemptCount: 0, lastErrorMessage: null }
            ).label}
          </Text>
        </View>
      )}
      {status === "ready" && playableTrack && (
        <View style={styles.readyActions}>
          {cacheState === "caching" && <Text style={styles.cacheLabel}>缓存中</Text>}
          {cacheState === "error" && <Text style={styles.cacheLabel}>缓存失败</Text>}
          <Pressable
            style={[styles.actionButton, styles.playButton]}
            onPress={() => onPlay(playableTrack)}
          >
            <Text style={styles.actionText}>Play</Text>
          </Pressable>
        </View>
      )}
      {status === "failed" && (
        <Pressable
          style={[styles.actionButton, styles.convertButton]}
          onPress={() => onConvert(video)}
        >
          <Text style={styles.actionText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  pillsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#dbcbb9" },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#eee", marginRight: 8 },
  pillActive: { backgroundColor: "#b65a36" },
  pillText: { fontSize: 13, color: "#555" },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FF6B35", justifyContent: "center", alignItems: "center", marginLeft: 4 },
  addButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#777", textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 15, color: "#777" },
  errorText: { fontSize: 15, color: "red" },
  emptyFeed: { textAlign: "center", color: "#999", marginTop: 40 },
  listContent: { paddingHorizontal: 18, paddingTop: 8 },
  card: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#eee" },
  cardContent: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: "500", lineHeight: 20 },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  actionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: "center", justifyContent: "center" },
  convertButton: { backgroundColor: "#FF6B35" },
  playButton: { backgroundColor: "#4CAF50" },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  phaseLabel: { fontSize: 11, color: "#FF6B35", fontWeight: "600", textAlign: "center" },
  readyActions: { alignItems: "center", gap: 4 },
  cacheLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  addChannelButton: { marginTop: 20, backgroundColor: "#FF6B35", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  addChannelButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
