import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubscribedChannels, addChannel, removeChannel, isChannelSubscribed } from "./storage";
import { fetchFeedItems, resolveFeedSource } from "./api";
import type { FeedItemWithStatus, FeedSource } from "./types";

const MAX_FEED_ITEMS = 100;

export function useSubscribedChannels() {
  return useQuery({
    queryKey: ["youtubeSubscriptions"],
    queryFn: () => getSubscribedChannels(),
  });
}

export function useFeedVideos() {
  return useQuery({
    queryKey: ["youtubeFeed"],
    queryFn: async (): Promise<FeedItemWithStatus[]> => {
      const channels = await getSubscribedChannels();
      if (channels.length === 0) return [];

      const items = await fetchFeedItems(channels);

      // For v1, all videos start as "new". Job matching can be enhanced later.
      return items.slice(0, MAX_FEED_ITEMS).map((v) => ({
        ...v,
        status: "new" as const,
      }));
    },
    staleTime: 0,
  });
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
