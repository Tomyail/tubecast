import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage before importing the module under test
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

// Use dynamic import after mock setup
const { getSubmittedFeedJobs, saveSubmittedFeedJob, removeSubmittedFeedJob } = await import(
  "../../src/features/youtubeFeed/submittedJobsStorage"
);

const STORAGE_KEY = "feed_submitted_jobs";

const makeJob = (overrides: Partial<{ jobId: string; sourceUrl: string; submittedAt: string }> = {}) => ({
  jobId: "job-123",
  sourceUrl: "https://www.youtube.com/watch?v=abc123",
  submittedAt: new Date().toISOString(),
  ...overrides,
});

describe("submittedJobsStorage", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("returns {} when no storage exists", async () => {
    const result = await getSubmittedFeedJobs();
    expect(result).toEqual({});
  });

  it("saves and retrieves a submitted job", async () => {
    const job = makeJob();
    await saveSubmittedFeedJob("item-1", job);
    const result = await getSubmittedFeedJobs();
    expect(result).toEqual({ "item-1": job });
  });

  it("overwrites existing job for same platformItemId on Retry", async () => {
    const job1 = makeJob({ jobId: "job-aaa" });
    const job2 = makeJob({ jobId: "job-bbb" });
    await saveSubmittedFeedJob("item-1", job1);
    await saveSubmittedFeedJob("item-1", job2);
    const result = await getSubmittedFeedJobs();
    expect(result["item-1"].jobId).toBe("job-bbb");
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("removes a job by platformItemId", async () => {
    const job = makeJob();
    await saveSubmittedFeedJob("item-1", job);
    await removeSubmittedFeedJob("item-1");
    const result = await getSubmittedFeedJobs();
    expect(result).toEqual({});
  });

  it("cleans entries older than 24 hours", async () => {
    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const oldJob = makeJob({ submittedAt: twentyFiveHoursAgo.toISOString() });
    // Write directly to store to bypass TTL check in saveSubmittedFeedJob
    store[STORAGE_KEY] = JSON.stringify({ "item-old": oldJob });

    const result = await getSubmittedFeedJobs(now);
    expect(result).toEqual({});
  });

  it("ignores malformed JSON without crashing", async () => {
    store[STORAGE_KEY] = "not valid json {{";
    const result = await getSubmittedFeedJobs();
    expect(result).toEqual({});
  });

  it("ignores malformed entries (missing required fields) without crashing", async () => {
    store[STORAGE_KEY] = JSON.stringify({
      "item-bad": { sourceUrl: "https://example.com", submittedAt: new Date().toISOString() },
      // missing jobId
    });
    const result = await getSubmittedFeedJobs();
    expect(result).toEqual({});
  });

  it("does not clean valid entries within 24h", async () => {
    const now = new Date();
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    const recentJob = makeJob({ submittedAt: twentyThreeHoursAgo.toISOString() });
    store[STORAGE_KEY] = JSON.stringify({ "item-recent": recentJob });

    const result = await getSubmittedFeedJobs(now);
    expect(result["item-recent"]).toEqual(recentJob);
  });
});
