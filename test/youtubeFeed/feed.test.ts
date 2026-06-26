import { describe, it, expect } from "vitest";
import { markItemConverting, markItemNew, markItemReady, mergeAndSortItems, matchJobStatus, type JobLookup } from "../../src/features/youtubeFeed/feed";
import type { FeedItem } from "../../src/features/youtubeFeed/types";

const makeItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  platform: "youtube",
  platformItemId: "vid1",
  platformSourceId: "UC_a",
  title: "Test Video",
  sourceTitle: "Channel A",
  thumbnailUrl: "https://example.com/v1.jpg",
  publishedAt: "2026-05-23T10:00:00Z",
  sourceUrl: "https://www.youtube.com/watch?v=vid1",
  ...overrides,
});

describe("mergeAndSortItems", () => {
  it("merges items from multiple sources and sorts by date descending", () => {
    const items = [
      [makeItem({ platformItemId: "v1", publishedAt: "2026-05-23T10:00:00Z" })],
      [makeItem({ platformItemId: "v2", publishedAt: "2026-05-23T12:00:00Z" })],
    ];
    const result = mergeAndSortItems(items);
    expect(result[0].platformItemId).toBe("v2");
    expect(result[1].platformItemId).toBe("v1");
  });

  it("deduplicates by platform item id", () => {
    const items = [
      [makeItem({ platformItemId: "v1" })],
      [makeItem({ platformItemId: "v1", title: "Duplicate" })],
    ];
    const result = mergeAndSortItems(items);
    expect(result).toHaveLength(1);
  });

  it("caps results to maxItems", () => {
    const items = [Array.from({ length: 20 }, (_, i) => makeItem({ platformItemId: `v${i}` }))];
    const result = mergeAndSortItems(items, 5);
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

  it("marks item as ready when job exists and is ready", () => {
    const item = makeItem({ platformItemId: "v_ready" });
    const result = matchJobStatus([item], lookup);
    expect(result[0].status).toBe("ready");
    expect(result[0].jobId).toBe("job1");
  });

  it("marks item as converting when job is processing", () => {
    const item = makeItem({ platformItemId: "v_processing" });
    const result = matchJobStatus([item], lookup);
    expect(result[0].status).toBe("converting");
  });

  it("marks item as converting when job is queued", () => {
    const item = makeItem({ platformItemId: "v_queued" });
    const result = matchJobStatus([item], lookup);
    expect(result[0].status).toBe("converting");
  });

  it("marks item as new when no job exists", () => {
    const item = makeItem({ platformItemId: "v_unknown" });
    const result = matchJobStatus([item], lookup);
    expect(result[0].status).toBe("new");
  });

  it("marks item as new when job failed, allowing retry", () => {
    const item = makeItem({ platformItemId: "v_failed" });
    const result = matchJobStatus([item], lookup);
    expect(result[0].status).toBe("new");
  });

  it("maps a mixed batch to all three statuses in one pass", () => {
    // Three-state mapping used by the publisher preview sheet:
    //   ready/processing/queued/missing -> ready/converting/new
    const batch = [
      makeItem({ platformItemId: "v_ready", title: "Ready one" }),
      makeItem({ platformItemId: "v_processing", title: "Processing one" }),
      makeItem({ platformItemId: "v_queued", title: "Queued one" }),
      makeItem({ platformItemId: "v_missing", title: "Brand new one" }),
    ];
    const result = matchJobStatus(batch, lookup);
    expect(result).toHaveLength(4);
    const byId = Object.fromEntries(result.map((r) => [r.platformItemId, r]));
    expect(byId.v_ready.status).toBe("ready");
    expect(byId.v_ready.jobId).toBe("job1");
    expect(byId.v_processing.status).toBe("converting");
    expect(byId.v_processing.jobId).toBe("job2");
    expect(byId.v_queued.status).toBe("converting");
    expect(byId.v_queued.jobId).toBe("job4");
    expect(byId.v_missing.status).toBe("new");
    expect(byId.v_missing.jobId).toBeUndefined();
  });
});

describe("markItemConverting", () => {
  it("updates the submitted item so publisher preview reflects conversion immediately", () => {
    const result = markItemConverting(
      [
        { ...makeItem({ platformItemId: "v1" }), status: "new" },
        { ...makeItem({ platformItemId: "v2" }), status: "new" },
      ],
      "v2",
      "job2",
    );

    expect(result?.[0]).toMatchObject({ platformItemId: "v1", status: "new" });
    expect(result?.[1]).toMatchObject({ platformItemId: "v2", status: "converting", jobId: "job2" });
  });

  it("keeps null item state unchanged while videos are loading", () => {
    expect(markItemConverting(null, "v1", "job1")).toBeNull();
  });
});

describe("publisher preview item status updates", () => {
  it("marks a converted item as ready when polling sees the job complete", () => {
    const result = markItemReady(
      [{ ...makeItem({ platformItemId: "v1" }), status: "converting", jobId: "job1" }],
      "v1",
      "job1",
    );

    expect(result?.[0]).toMatchObject({ platformItemId: "v1", status: "ready", jobId: "job1" });
  });

  it("marks a failed converted item as new so it can be retried", () => {
    const result = markItemNew(
      [{ ...makeItem({ platformItemId: "v1" }), status: "converting", jobId: "job1" }],
      "v1",
    );

    expect(result?.[0]).toMatchObject({ platformItemId: "v1", status: "new" });
    expect(result?.[0].jobId).toBeUndefined();
  });
});
