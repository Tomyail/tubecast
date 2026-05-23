import { describe, it, expect } from "vitest";
import { mergeAndSortVideos, matchJobStatus, type JobLookup } from "../../src/features/youtubeFeed/feed";
import type { FeedVideo } from "../../src/features/youtubeFeed/types";

const makeVideo = (overrides: Partial<FeedVideo> = {}): FeedVideo => ({
  videoId: "vid1",
  title: "Test Video",
  channelTitle: "Channel A",
  channelId: "UC_a",
  thumbnailUrl: "https://example.com/v1.jpg",
  publishedAt: "2026-05-23T10:00:00Z",
  watchUrl: "https://www.youtube.com/watch?v=vid1",
  ...overrides,
});

describe("mergeAndSortVideos", () => {
  it("merges videos from multiple channels and sorts by date descending", () => {
    const videos = [
      [makeVideo({ videoId: "v1", publishedAt: "2026-05-23T10:00:00Z" })],
      [makeVideo({ videoId: "v2", publishedAt: "2026-05-23T12:00:00Z" })],
    ];
    const result = mergeAndSortVideos(videos);
    expect(result[0].videoId).toBe("v2");
    expect(result[1].videoId).toBe("v1");
  });

  it("deduplicates by videoId", () => {
    const videos = [
      [makeVideo({ videoId: "v1" })],
      [makeVideo({ videoId: "v1", title: "Duplicate" })],
    ];
    const result = mergeAndSortVideos(videos);
    expect(result).toHaveLength(1);
  });

  it("caps results to maxItems", () => {
    const videos = [Array.from({ length: 20 }, (_, i) => makeVideo({ videoId: `v${i}` }))];
    const result = mergeAndSortVideos(videos, 5);
    expect(result).toHaveLength(5);
  });
});

describe("matchJobStatus", () => {
  const lookup: JobLookup = {
    v_ready: { status: "ready", jobId: "job1" },
    v_processing: { status: "processing", jobId: "job2" },
    v_failed: { status: "failed", jobId: "job3" },
    v_queued: { status: "queued", jobId: "job4" },
  };

  it("marks video as ready when job exists and is ready", () => {
    const video = makeVideo({ videoId: "v_ready" });
    const result = matchJobStatus([video], lookup);
    expect(result[0].status).toBe("ready");
    expect(result[0].jobId).toBe("job1");
  });

  it("marks video as converting when job is processing", () => {
    const video = makeVideo({ videoId: "v_processing" });
    const result = matchJobStatus([video], lookup);
    expect(result[0].status).toBe("converting");
  });

  it("marks video as converting when job is queued", () => {
    const video = makeVideo({ videoId: "v_queued" });
    const result = matchJobStatus([video], lookup);
    expect(result[0].status).toBe("converting");
  });

  it("marks video as new when no job exists", () => {
    const video = makeVideo({ videoId: "v_unknown" });
    const result = matchJobStatus([video], lookup);
    expect(result[0].status).toBe("new");
  });

  it("marks video as new when job failed (allows retry)", () => {
    const video = makeVideo({ videoId: "v_failed" });
    const result = matchJobStatus([video], lookup);
    expect(result[0].status).toBe("new");
  });
});
