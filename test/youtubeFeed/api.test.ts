import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchFeedItems, resolveFeedSource } from "../../src/features/youtubeFeed/api";

function mockFetch(response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })
  );
}

function mockFetchError(status: number, response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(response),
    })
  );
}

describe("youtubeFeed backend API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a YouTube input through the backend feed API", async () => {
    mockFetch({
      source: {
        platform: "youtube",
        platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx",
        title: "Test Channel",
        thumbnailUrl: "https://example.com/thumb.jpg",
        sourceUrl: "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
      },
    });

    const source = await resolveFeedSource("@TestChannel");

    expect(source).toEqual({
      platform: "youtube",
      platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx",
      title: "Test Channel",
      thumbnailUrl: "https://example.com/thumb.jpg",
      sourceUrl: "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://yt-audio.tomyail.com/api/feed/resolve-source",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ platform: "youtube", input: "@TestChannel" }),
      })
    );
  });

  it("fetches recent feed items through the backend feed API", async () => {
    mockFetch({
      items: [
        {
          platform: "youtube",
          platformItemId: "vid1",
          platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx",
          title: "Video One",
          sourceTitle: "Test Channel",
          thumbnailUrl: "https://example.com/v1.jpg",
          publishedAt: "2026-05-23T10:00:00Z",
          sourceUrl: "https://www.youtube.com/watch?v=vid1",
        },
      ],
      errors: [],
    });

    const items = await fetchFeedItems([
      {
        platform: "youtube",
        platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx",
        title: "Test Channel",
        thumbnailUrl: "https://example.com/thumb.jpg",
        sourceUrl: "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].platformItemId).toBe("vid1");
    expect(fetch).toHaveBeenCalledWith(
      "https://yt-audio.tomyail.com/api/feed/recent-items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sources: [{ platform: "youtube", platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx" }],
        }),
      })
    );
  });

  it("throws stable backend error messages", async () => {
    mockFetchError(404, { error: { code: "source_not_found", message: "Feed source not found" } });

    await expect(resolveFeedSource("@missing")).rejects.toThrow("Feed source not found");
  });
});
