import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DiscoverResponse } from "../../src/features/discover/types";

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

const { DISCOVER_CACHE_MAX_AGE_MS, getCachedDiscover, saveCachedDiscover } = await import(
  "../../src/features/discover/cache"
);

const STORAGE_KEY = "discover_query_cache_v1";
const now = new Date("2026-06-28T00:00:00.000Z");

const makeResponse = (): DiscoverResponse => ({
  recent: [
    {
      jobId: "job-1",
      title: "First",
      thumbnailUrl: null,
      durationSeconds: 120,
      sourceId: "video-1",
      convertCount: 2,
    },
  ],
  popular: [],
});

describe("discover cache", () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  });

  it("returns null when no cache exists", async () => {
    await expect(getCachedDiscover(now)).resolves.toBeNull();
  });

  it("saves and restores discover data with timestamp", async () => {
    const data = makeResponse();
    await saveCachedDiscover(data, now);

    await expect(getCachedDiscover(now)).resolves.toEqual({
      savedAtMs: now.getTime(),
      data,
    });
  });

  it("ignores entries older than max age", async () => {
    const savedAt = new Date(now.getTime() - DISCOVER_CACHE_MAX_AGE_MS - 1);
    store[STORAGE_KEY] = JSON.stringify({ savedAt: savedAt.toISOString(), data: makeResponse() });

    await expect(getCachedDiscover(now)).resolves.toBeNull();
  });

  it("ignores malformed JSON", async () => {
    store[STORAGE_KEY] = "not json";

    await expect(getCachedDiscover(now)).resolves.toBeNull();
  });

  it("ignores malformed payloads", async () => {
    store[STORAGE_KEY] = JSON.stringify({
      savedAt: now.toISOString(),
      data: { recent: [{ jobId: "missing fields" }], popular: [] },
    });

    await expect(getCachedDiscover(now)).resolves.toBeNull();
  });
});
