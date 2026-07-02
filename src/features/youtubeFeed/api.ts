import { apiClient } from "../../shared/apiClient";
import type { FeedItem, FeedSource } from "./types";

async function request<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await apiClient.post<T>(path, body, { signal });
  return res.data;
}

export async function resolveFeedSource(input: string): Promise<FeedSource> {
  const payload = await request<{ source: FeedSource }>("/api/feed/resolve-source", {
    platform: "youtube",
    input: input.trim(),
  });
  return payload.source;
}

export async function fetchFeedItems(sources: FeedSource[], signal?: AbortSignal): Promise<FeedItem[]> {
  if (sources.length === 0) {
    return [];
  }

  const payload = await request<{ items: FeedItem[]; errors: Array<{ message: string }> }>(
    "/api/feed/recent-items",
    {
      sources: sources.map((source) => ({
        platform: source.platform,
        platformSourceId: source.platformSourceId,
      })),
    },
    signal
  );
  return payload.items;
}
