import { SERVER_URL } from "../settings/storage";
import type { FeedItem, FeedSource } from "./types";

type FeedErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const errorPayload = payload as FeedErrorResponse | null;
    throw new Error(errorPayload?.error?.message || `Request failed with status ${res.status}`);
  }

  return payload as T;
}

export async function resolveFeedSource(input: string): Promise<FeedSource> {
  const payload = await request<{ source: FeedSource }>("/api/feed/resolve-source", {
    platform: "youtube",
    input: input.trim(),
  });
  return payload.source;
}

export async function fetchFeedItems(sources: FeedSource[]): Promise<FeedItem[]> {
  if (sources.length === 0) {
    return [];
  }

  const payload = await request<{ items: FeedItem[]; errors: Array<{ message: string }> }>("/api/feed/recent-items", {
    sources: sources.map((source) => ({
      platform: source.platform,
      platformSourceId: source.platformSourceId,
    })),
  });
  return payload.items;
}
