import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubscribedChannels, addChannel, removeChannel } from "./storage";
import { fetchRecentVideos, resolveChannel, parseChannelInput } from "./api";
import { mergeAndSortVideos } from "./feed";
import type { SubscribedChannel, FeedVideoWithStatus } from "./types";
import type { YouTubeApiConfig } from "./api";

const VIDEOS_PER_CHANNEL = 5;
const MAX_FEED_ITEMS = 100;

export function useSubscribedChannels() {
  return useQuery({
    queryKey: ["youtubeSubscriptions"],
    queryFn: () => getSubscribedChannels(),
  });
}

export function useFeedVideos(apiKey: string | null) {
  return useQuery({
    queryKey: ["youtubeFeed", apiKey],
    queryFn: async (): Promise<FeedVideoWithStatus[]> => {
      if (!apiKey) return [];
      const config: YouTubeApiConfig = { apiKey };
      const channels = await getSubscribedChannels();
      if (channels.length === 0) return [];

      const channelVideos = await Promise.all(
        channels.map(async (ch) => {
          if (!ch.uploadsPlaylistId) return [];
          try {
            return await fetchRecentVideos(config, ch.uploadsPlaylistId, VIDEOS_PER_CHANNEL);
          } catch {
            return [];
          }
        }),
      );

      const merged = mergeAndSortVideos(channelVideos, MAX_FEED_ITEMS);

      // For v1, all videos start as "new". Job matching can be enhanced later.
      return merged.map((v) => ({
        ...v,
        status: "new" as const,
      }));
    },
    enabled: !!apiKey,
    staleTime: 0,
  });
}

export function useAddChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, apiKey }: { input: string; apiKey: string }) => {
      const parsed = parseChannelInput(input);
      if (!parsed) throw new Error("Unable to recognize this channel");

      const config: YouTubeApiConfig = { apiKey };
      const resolved = await resolveChannel(config, parsed);
      if (!resolved) throw new Error("Channel not found");
      if (!resolved.uploadsPlaylistId) throw new Error("Channel has no public uploads playlist");

      const channel: SubscribedChannel = {
        ...resolved,
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
