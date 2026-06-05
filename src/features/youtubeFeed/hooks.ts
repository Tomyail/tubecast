import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubscribedChannels, addChannel, removeChannel } from "./storage";
import { fetchFeedItems, resolveFeedSource } from "./api";
import type { FeedItemWithStatus } from "./types";

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
