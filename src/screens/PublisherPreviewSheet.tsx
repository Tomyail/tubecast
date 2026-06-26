import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Screen from "../components/Screen";
import { useSubmitJob } from "../features/jobs/hooks";
import { getJob } from "../features/jobs/api";
import { trackFromReadyJob } from "../features/jobs/track";
import { usePlaylist } from "../features/playlist/context";
import { getAllTracks } from "../features/playlist/storage";
import type { Track } from "../features/playlist/storage";
import { usePlayer } from "../features/player/context";
import { useAppTheme } from "../app/theme";
import { useTranslation } from "../i18n";
import type { RootStackParamList } from "../app/navigation/types";
import {
  useChannelSubscription,
  useRemoveChannel,
  useSubscribeChannel,
} from "../features/youtubeFeed/hooks";
import { fetchFeedItems } from "../features/youtubeFeed/api";
import { markItemConverting, markItemNew, markItemReady, matchJobStatus, type JobLookup } from "../features/youtubeFeed/feed";
import type { FeedItemWithStatus, FeedSource } from "../features/youtubeFeed/types";
import {
  getSubmittedFeedJobs,
  saveSubmittedFeedJob,
} from "../features/youtubeFeed/submittedJobsStorage";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type PublisherRoute = RouteProp<RootStackParamList, "PublisherPreview">;

// Parse a YouTube video id from common URL shapes (watch?v=, youtu.be/, /shorts/).
// Returns null for anything we can't confidently resolve — the caller treats
// that video as "new" (no local job match).
function youTubeVideoIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const isYouTube =
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be" ||
    host === "www.youtu.be";
  if (!isYouTube) return null;

  const vParam = parsed.searchParams.get("v");
  if (vParam) return vParam;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (host === "youtu.be" || host === "www.youtu.be") {
    return segments[0] ?? null;
  }
  // /shorts/<id>, /embed/<id>, /v/<id>
  if (segments.length >= 2 && ["shorts", "embed", "v"].includes(segments[0])) {
    return segments[1] ?? null;
  }
  return null;
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

export default function PublisherPreviewSheet() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PublisherRoute>();
  const { channelId, channelName } = route.params;
  const { playTrack } = usePlayer();
  const { addTrack } = usePlaylist();

  const subscription = useChannelSubscription(channelId);
  const subscribeMutation = useSubscribeChannel();
  const unsubscribeMutation = useRemoveChannel();

  const submitJob = useSubmitJob();

  const [items, setItems] = useState<FeedItemWithStatus[] | null>(null);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [tracksCache, setTracksCache] = useState<Track[]>([]);

  const displaySource: FeedSource = useMemo(
    () => ({
      platform: "youtube",
      platformSourceId: channelId,
      title: channelName ?? channelId,
      thumbnailUrl: null,
      sourceUrl: `https://www.youtube.com/channel/${channelId}`,
      addedAt: new Date().toISOString(),
    }),
    [channelId, channelName],
  );

  const isSubscribed = subscription.data === true;
  const anyMutationPending = subscribeMutation.isPending || unsubscribeMutation.isPending;

  const buildJobLookup = useCallback(async (): Promise<{ lookup: JobLookup; tracks: Track[] }> => {
    const [tracks, submitted] = await Promise.all([
      getAllTracks(),
      getSubmittedFeedJobs(),
    ]);
    const lookup: JobLookup = {};
    for (const track of tracks) {
      const vid = youTubeVideoIdFromUrl(track.sourceUrl);
      if (vid) lookup[vid] = { status: "ready", jobId: track.jobId };
    }
    for (const [vid, entry] of Object.entries(submitted)) {
      if (!lookup[vid]) lookup[vid] = { status: "converting", jobId: entry.jobId };
    }
    return { lookup, tracks };
  }, []);

  const loadVideos = useCallback(async () => {
    setLoadError(false);
    try {
      const { lookup, tracks } = await buildJobLookup();
      setTracksCache(tracks);
      const fetched = await fetchFeedItems([displaySource]);
      const withStatus = matchJobStatus(fetched, lookup);
      setItems(withStatus);
    } catch {
      setItems(null);
      setLoadError(true);
    }
  }, [buildJobLookup, displaySource]);

  // Lazy load on mount — never prefetch (locked decision #5).
  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    const convertingItems = items?.filter((item) => item.status === "converting" && item.jobId) ?? [];
    if (convertingItems.length === 0) return;

    let cancelled = false;
    const poll = async () => {
      const results = await Promise.all(
        convertingItems.map(async (item) => {
          try {
            return { item, job: await getJob(item.jobId!) };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;

      for (const result of results) {
        if (!result) continue;
        const { item, job } = result;
        if (job.status === "ready") {
          const track = trackFromReadyJob(job);
          await addTrack(track);
          if (cancelled) return;
          setTracksCache((prev) =>
            prev.some((existing) => existing.id === track.id)
              ? prev.map((existing) => (existing.id === track.id ? track : existing))
              : [...prev, track],
          );
          setItems((prev) => markItemReady(prev, item.platformItemId, job.id));
        } else if (job.status === "failed" || job.status === "expired") {
          setItems((prev) => markItemNew(prev, item.platformItemId));
        }
      }
    };

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [addTrack, items]);

  const handleToggleSubscribe = () => {
    if (isSubscribed) {
      void unsubscribeMutation.mutate(channelId);
    } else {
      void subscribeMutation.mutate(displaySource);
    }
  };

  const handleRowPress = (item: FeedItemWithStatus) => {
    if (item.status === "ready" && item.jobId) {
      // Resolve the full Track from the local playlist; fall back to Convert
      // if the track was removed but the job is still ready.
      const track = tracksCache.find((tr) => tr.jobId === item.jobId);
      navigation.goBack();
      if (track) {
        void playTrack(track, tracksCache);
        navigation.navigate("Player", { jobId: item.jobId });
      } else {
        navigation.navigate("Convert", { jobId: item.jobId });
      }
      return;
    }
    if (item.status === "converting" && item.jobId) {
      // PlayerScreen doesn't read route params — non-ready jobs go to Convert.
      navigation.goBack();
      navigation.navigate("Convert", { jobId: item.jobId });
      return;
    }
  };

  const handleConfirmConvert = async (item: FeedItemWithStatus) => {
    setSubmittingIds((prev) => new Set(prev).add(item.platformItemId));
    try {
      const result = await submitJob.mutateAsync(item.sourceUrl);
      await saveSubmittedFeedJob(item.platformItemId, {
        jobId: result.id,
        sourceUrl: item.sourceUrl,
        submittedAt: new Date().toISOString(),
      });
      setItems((prev) => markItemConverting(prev, item.platformItemId, result.id));
    } catch {
      // Keep the row as new so the user can retry.
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.platformItemId);
        return next;
      });
    }
  };

  const topThree = items?.slice(0, 3) ?? [];

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.elevatedSurface }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>
              {(channelName ?? channelId).slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={[styles.channelName, { color: colors.primaryText }]}>
              {channelName ?? channelId}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={anyMutationPending}
              onPress={handleToggleSubscribe}
              style={[
                styles.subscribeButton,
                { backgroundColor: isSubscribed ? colors.elevatedSurface : colors.tint },
              ]}
            >
              {anyMutationPending ? (
                <ActivityIndicator color={isSubscribed ? colors.primaryText : colors.tintText} size="small" />
              ) : (
                <Text
                  style={[
                    styles.subscribeText,
                    { color: isSubscribed ? colors.primaryText : colors.tintText },
                  ]}
                >
                  {isSubscribed ? t("publisher.subscribed") : t("publisher.subscribe")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
            {t("publisher.recentVideos")}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {loadError ? (
            <Pressable accessibilityRole="button" onPress={() => void loadVideos()} style={styles.retryBlock}>
              <Text style={[styles.retryText, { color: colors.tint }]}>{t("publisher.loadFailed")}</Text>
              <Text style={[styles.retryCta, { color: colors.tint }]}>{t("publisher.retry")}</Text>
            </Pressable>
          ) : items === null ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.secondaryText} />
            </View>
          ) : topThree.length === 0 ? (
            <Text style={[styles.empty, { color: colors.secondaryText }]}>{t("publisher.empty")}</Text>
          ) : (
            topThree.map((item) => {
              const isSubmitting = submittingIds.has(item.platformItemId);
              return (
                <View
                  key={`${item.platform}:${item.platformItemId}`}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.rowBody}>
                    <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.primaryText }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.secondaryText }]}>
                      {formatRelativeTime(item.publishedAt, t)}
                    </Text>
                  </View>

                  {item.status === "ready" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleRowPress(item)}
                      style={styles.statusPill}
                    >
                      <Text style={[styles.statusPillText, { color: colors.success }]}>
                        {t("publisher.ready")}
                      </Text>
                    </Pressable>
                  ) : item.status === "converting" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleRowPress(item)}
                      style={styles.statusPill}
                    >
                      <Text style={[styles.statusPillText, { color: colors.secondaryText }]}>
                        {t("publisher.converting")}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => void handleConfirmConvert(item)}
                      style={[styles.convertButton, { backgroundColor: colors.tint, opacity: isSubmitting ? 0.6 : 1 }]}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={colors.tintText} size="small" />
                      ) : (
                        <Text style={[styles.convertText, { color: colors.tintText }]}>
                          {t("publisher.convert")}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  header: { alignItems: "center", flexDirection: "row", gap: 14, paddingBottom: 16 },
  avatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { fontSize: 20, fontWeight: "700" },
  headerText: { flex: 1, gap: 6 },
  channelName: { fontSize: 17, fontWeight: "600" },
  subscribeButton: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start" },
  subscribeText: { fontSize: 14, fontWeight: "600" },
  sectionHeader: { paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  listContent: { gap: 0 },
  loadingBlock: { alignItems: "center", paddingVertical: 32 },
  empty: { fontSize: 15, paddingVertical: 32, textAlign: "center" },
  retryBlock: { alignItems: "center", gap: 6, paddingVertical: 32 },
  retryText: { fontSize: 15 },
  retryCta: { fontSize: 15, fontWeight: "600" },
  row: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingVertical: 12 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowMeta: { fontSize: 12 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 4 },
  statusPillText: { fontSize: 13, fontWeight: "600" },
  convertButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  convertText: { fontSize: 13, fontWeight: "600" },
});
