import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FeedItemWithStatus, FeedSource } from "../../src/features/youtubeFeed/types";

const store: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (key: string) => Promise.resolve(store[key] || null),
    setItem: (key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      delete store[key];
      return Promise.resolve();
    },
  },
}));

const { YOUTUBE_FEED_CACHE_MAX_AGE_MS, getCachedYoutubeFeed, saveCachedYoutubeFeed } = await import(
  "../../src/features/youtubeFeed/cache"
);

const STORAGE_KEY = "youtube_feed_query_cache_v1";
const now = new Date("2026-06-28T00:00:00.000Z");

const makeChannel = (id: string): FeedSource => ({
  platform: "youtube",
  platformSourceId: id,
  title: `Channel ${id}`,
  thumbnailUrl: null,
  sourceUrl: `https://www.youtube.com/channel/${id}`,
  addedAt: now.toISOString(),
});

const makeItem = (id = "video-1"): FeedItemWithStatus => ({
  platform: "youtube",
  platformItemId: id,
  platformSourceId: "UC_a",
  title: "Video",
  sourceTitle: "Channel UC_a",
  thumbnailUrl: null,
  publishedAt: now.toISOString(),
  sourceUrl: `https://www.youtube.com/watch?v=${id}`,
  status: "new",
});

describe("youtube feed cache", () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  });

  it("returns null when no cache exists", async () => {
    await expect(getCachedYoutubeFeed([makeChannel("UC_a")], now)).resolves.toBeNull();
  });

  it("saves and restores feed data for the same channels", async () => {
    const channels = [makeChannel("UC_a"), makeChannel("UC_b")];
    const data = [makeItem()];
    await saveCachedYoutubeFeed(channels, data, now);

    await expect(getCachedYoutubeFeed([...channels].reverse(), now)).resolves.toEqual({
      savedAtMs: now.getTime(),
      data,
    });
  });

  it("ignores cache when subscriptions changed", async () => {
    await saveCachedYoutubeFeed([makeChannel("UC_a")], [makeItem()], now);

    await expect(getCachedYoutubeFeed([makeChannel("UC_b")], now)).resolves.toBeNull();
  });

  it("ignores entries older than max age", async () => {
    const savedAt = new Date(now.getTime() - YOUTUBE_FEED_CACHE_MAX_AGE_MS - 1);
    store[STORAGE_KEY] = JSON.stringify({
      savedAt: savedAt.toISOString(),
      sourceKey: "youtube:UC_a",
      data: [makeItem()],
    });

    await expect(getCachedYoutubeFeed([makeChannel("UC_a")], now)).resolves.toBeNull();
  });

  it("ignores malformed payloads", async () => {
    store[STORAGE_KEY] = JSON.stringify({
      savedAt: now.toISOString(),
      sourceKey: "youtube:UC_a",
      data: [{ platformItemId: "missing fields" }],
    });

    await expect(getCachedYoutubeFeed([makeChannel("UC_a")], now)).resolves.toBeNull();
  });
});
