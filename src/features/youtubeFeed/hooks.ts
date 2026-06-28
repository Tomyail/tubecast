import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubscribedChannels, addChannel, removeChannel, isChannelSubscribed } from "./storage";
import { fetchFeedItems, resolveFeedSource } from "./api";
import type { FeedItemWithStatus, FeedSource } from "./types";
import { getCachedYoutubeFeed, saveCachedYoutubeFeed } from "./cache";

const MAX_FEED_ITEMS = 100;
const YOUTUBE_FEED_QUERY_KEY = ["youtubeFeed"] as const;

export function useSubscribedChannels() {
  return useQuery({
    queryKey: ["youtubeSubscriptions"],
    queryFn: () => getSubscribedChannels(),
  });
}

export function useFeedVideos() {
  const queryClient = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(() => queryClient.getQueryData(YOUTUBE_FEED_QUERY_KEY) === undefined);

  useEffect(() => {
    if (!isRestoring) return;
    let cancelled = false;

    getSubscribedChannels()
      .then((channels) => getCachedYoutubeFeed(channels))
      .then((cached) => {
        if (cancelled) return;
        if (cached && queryClient.getQueryData(YOUTUBE_FEED_QUERY_KEY) === undefined) {
          queryClient.setQueryData(YOUTUBE_FEED_QUERY_KEY, cached.data, { updatedAt: cached.savedAtMs });
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isRestoring, queryClient]);

  const query = useQuery({
    queryKey: YOUTUBE_FEED_QUERY_KEY,
    queryFn: async (): Promise<FeedItemWithStatus[]> => {
      const channels = await getSubscribedChannels();
      if (channels.length === 0) {
        void saveCachedYoutubeFeed(channels, []).catch((error) => {
          console.warn("Failed to persist youtube feed cache", error);
        });
        return [];
      }

      const items = await fetchFeedItems(channels);

      // For v1, all videos start as "new". Job matching can be enhanced later.
      const videos = items.slice(0, MAX_FEED_ITEMS).map((v) => ({
        ...v,
        status: "new" as const,
      }));
      void saveCachedYoutubeFeed(channels, videos).catch((error) => {
        console.warn("Failed to persist youtube feed cache", error);
      });
      return videos;
    },
    staleTime: 0,
    enabled: !isRestoring,
  });

  return { ...query, isRestoring };
}

export function useAddChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input }: { input: string }) => {
      const channel = {
        ...(await resolveFeedSource(input)),
        addedAt: new Date().toISOString(),
      };
      await addChannel(channel);
      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtubeSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["youtubeFeed"] });
    },
  });
}

export function useRemoveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      await removeChannel(channelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtubeSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["youtubeFeed"] });
    },
  });
}

// 直接用我们已有的 FeedSource（channel_id + name）订阅，不调 resolve-source。
// 给发布者预览 sheet 用——sheet 已从播放中的 job 拿到频道身份。
export function useSubscribeChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: FeedSource) => {
      await addChannel(channel);
      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtubeSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["youtubeFeed"] });
    },
  });
}

// 单个频道 id 的纯本地订阅检查。给 sheet 渲染订阅按钮初始态用，不走网络。
export function useChannelSubscription(platformSourceId: string | null) {
  return useQuery({
    queryKey: ["youtubeSubscriptions", platformSourceId],
    enabled: !!platformSourceId,
    queryFn: () => isChannelSubscribed(platformSourceId as string),
  });
}
