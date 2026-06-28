import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FeedItemWithStatus, FeedSource } from "./types";

const STORAGE_KEY = "youtube_feed_query_cache_v1";
export const YOUTUBE_FEED_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredYoutubeFeedCache {
  savedAt: string;
  sourceKey: string;
  data: FeedItemWithStatus[];
}

export interface CachedYoutubeFeed {
  savedAtMs: number;
  data: FeedItemWithStatus[];
}

function sourceKeyFromChannels(channels: FeedSource[]): string {
  return channels
    .map((channel) => `${channel.platform}:${channel.platformSourceId}`)
    .sort()
    .join("|");
}

function isFeedItemWithStatus(value: unknown): value is FeedItemWithStatus {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.platform === "youtube" &&
    typeof item.platformItemId === "string" &&
    typeof item.platformSourceId === "string" &&
    typeof item.title === "string" &&
    typeof item.sourceTitle === "string" &&
    (typeof item.thumbnailUrl === "string" || item.thumbnailUrl === null) &&
    typeof item.publishedAt === "string" &&
    typeof item.sourceUrl === "string" &&
    (item.status === "new" || item.status === "converting" || item.status === "ready" || item.status === "failed") &&
    (item.jobId === undefined || typeof item.jobId === "string")
  );
}

function parseStoredCache(raw: string | null, channels: FeedSource[], now: Date): CachedYoutubeFeed | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredYoutubeFeedCache>;
    const expectedSourceKey = sourceKeyFromChannels(channels);
    if (
      !parsed ||
      typeof parsed.savedAt !== "string" ||
      parsed.sourceKey !== expectedSourceKey ||
      !Array.isArray(parsed.data) ||
      !parsed.data.every(isFeedItemWithStatus)
    ) {
      return null;
    }
    const savedAt = Date.parse(parsed.savedAt);
    if (Number.isNaN(savedAt) || now.getTime() - savedAt > YOUTUBE_FEED_CACHE_MAX_AGE_MS) {
      return null;
    }
    return { savedAtMs: savedAt, data: parsed.data };
  } catch {
    return null;
  }
}

export async function getCachedYoutubeFeed(channels: FeedSource[], now = new Date()): Promise<CachedYoutubeFeed | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseStoredCache(raw, channels, now);
}

export async function saveCachedYoutubeFeed(channels: FeedSource[], data: FeedItemWithStatus[], now = new Date()): Promise<void> {
  const payload: StoredYoutubeFeedCache = {
    savedAt: now.toISOString(),
    sourceKey: sourceKeyFromChannels(channels),
    data,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
