import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiscoverItem, DiscoverResponse } from "./types";

const STORAGE_KEY = "discover_query_cache_v1";
export const DISCOVER_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredDiscoverCache {
  savedAt: string;
  data: DiscoverResponse;
}

export interface CachedDiscover {
  savedAtMs: number;
  data: DiscoverResponse;
}

function isDiscoverItem(value: unknown): value is DiscoverItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.jobId === "string" &&
    typeof item.title === "string" &&
    (typeof item.thumbnailUrl === "string" || item.thumbnailUrl === null) &&
    (typeof item.durationSeconds === "number" || item.durationSeconds === null) &&
    typeof item.sourceId === "string" &&
    typeof item.convertCount === "number"
  );
}

function isDiscoverResponse(value: unknown): value is DiscoverResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.recent) &&
    Array.isArray(response.popular) &&
    response.recent.every(isDiscoverItem) &&
    response.popular.every(isDiscoverItem)
  );
}

function parseStoredCache(raw: string | null, now: Date): CachedDiscover | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDiscoverCache>;
    if (!parsed || typeof parsed.savedAt !== "string" || !isDiscoverResponse(parsed.data)) {
      return null;
    }
    const savedAt = Date.parse(parsed.savedAt);
    if (Number.isNaN(savedAt) || now.getTime() - savedAt > DISCOVER_CACHE_MAX_AGE_MS) {
      return null;
    }
    return { savedAtMs: savedAt, data: parsed.data };
  } catch {
    return null;
  }
}

export async function getCachedDiscover(now = new Date()): Promise<CachedDiscover | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseStoredCache(raw, now);
}

export async function saveCachedDiscover(data: DiscoverResponse, now = new Date()): Promise<void> {
  const payload: StoredDiscoverCache = {
    savedAt: now.toISOString(),
    data,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
