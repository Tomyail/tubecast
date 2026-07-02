import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the shared axios client so the API functions are tested in isolation
// from axios internals. vi.hoisted lets the mock fn survive vi.mock's hoisting.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../../src/shared/apiClient", () => ({
  apiClient: { post },
}));

import { fetchFeedItems, resolveFeedSource } from "../../src/features/youtubeFeed/api";

describe("youtubeFeed backend API client", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("resolves a YouTube input through the backend feed API", async () => {
    post.mockResolvedValue({
      data: {
        source: {
          platform: "youtube",
          platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx",
          title: "Test Channel",
          thumbnailUrl: "https://example.com/thumb.jpg",
          sourceUrl: "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
        },
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
    expect(post).toHaveBeenCalledWith(
      "/api/feed/resolve-source",
      { platform: "youtube", input: "@TestChannel" },
      { signal: undefined }
    );
  });

  it("fetches recent feed items through the backend feed API", async () => {
    post.mockResolvedValue({
      data: {
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
      },
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
    expect(post).toHaveBeenCalledWith(
      "/api/feed/recent-items",
      {
        sources: [{ platform: "youtube", platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx" }],
      },
      { signal: undefined }
    );
  });

  it("forwards the abort signal to the client", async () => {
    post.mockResolvedValue({ data: { items: [], errors: [] } });
    const controller = new AbortController();

    await fetchFeedItems(
      [{ platform: "youtube", platformSourceId: "UCxxxxxxxxxxxxxxxxxxxxxx", title: "c", thumbnailUrl: "u", sourceUrl: "s" }],
      controller.signal
    );

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("throws stable backend error messages", async () => {
    // The apiClient interceptor maps non-2xx responses to shared error types;
    // simulate the post-rejection shape (ApiError carries the message).
    const { ApiError } = await import("../../src/shared/errors");
    post.mockRejectedValue(new ApiError(404, "Feed source not found"));

    await expect(resolveFeedSource("@missing")).rejects.toThrow("Feed source not found");
  });
});
