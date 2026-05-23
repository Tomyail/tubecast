import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseChannelInput, resolveChannel, fetchRecentVideos, type YouTubeApiConfig } from "../../src/features/youtubeFeed/api";

// Helper to mock global fetch
function mockFetch(response: any) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  }));
}

function mockFetchError(status: number, message: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  }));
}

describe("parseChannelInput", () => {
  it("extracts channel ID from /channel/ URL", () => {
    const result = parseChannelInput("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx");
    expect(result).toEqual({ type: "id", value: "UCxxxxxxxxxxxxxxxxxxxxxx" });
  });

  it("extracts handle from /@handle URL", () => {
    const result = parseChannelInput("https://www.youtube.com/@MrBeast");
    expect(result).toEqual({ type: "handle", value: "@MrBeast" });
  });

  it("treats raw UC... as channel ID", () => {
    const result = parseChannelInput("UCxxxxxxxxxxxxxxxxxxxxxx");
    expect(result).toEqual({ type: "id", value: "UCxxxxxxxxxxxxxxxxxxxxxx" });
  });

  it("treats @handle as handle", () => {
    const result = parseChannelInput("@MrBeast");
    expect(result).toEqual({ type: "handle", value: "@MrBeast" });
  });

  it("returns null for unrecognized input", () => {
    const result = parseChannelInput("not a valid input");
    expect(result).toBeNull();
  });
});

describe("resolveChannel", () => {
  const config: YouTubeApiConfig = { apiKey: "test-key" };

  beforeEach(() => { vi.restoreAllMocks(); });

  it("resolves a channel by ID", async () => {
    mockFetch({
      items: [{
        id: "UC_xxxxxxxxxxxxxxxxxxxx",
        snippet: { title: "Test Channel", thumbnails: { default: { url: "https://example.com/thumb.jpg" } } },
        contentDetails: { relatedPlaylists: { uploads: "UU_xxxxxxxxxxxxxxxxxxxx" } },
      }],
    });

    const channel = await resolveChannel(config, { type: "id", value: "UC_xxxxxxxxxxxxxxxxxxxx" });
    expect(channel).toEqual({
      id: "UC_xxxxxxxxxxxxxxxxxxxx",
      title: "Test Channel",
      thumbnailUrl: "https://example.com/thumb.jpg",
      uploadsPlaylistId: "UU_xxxxxxxxxxxxxxxxxxxx",
    });
  });

  it("resolves a channel by handle", async () => {
    mockFetch({
      items: [{
        id: "UC_xxxxxxxxxxxxxxxxxxxx",
        snippet: { title: "Handle Channel", thumbnails: { default: { url: "https://example.com/thumb.jpg" } } },
        contentDetails: { relatedPlaylists: { uploads: "UU_xxxxxxxxxxxxxxxxxxxx" } },
      }],
    });

    const channel = await resolveChannel(config, { type: "handle", value: "@TestChannel" });
    expect(channel).toBeDefined();
    expect(channel!.title).toBe("Handle Channel");
  });

  it("returns null when no items found", async () => {
    mockFetch({ items: [] });
    const channel = await resolveChannel(config, { type: "id", value: "UC_nonexistent0000000000000" });
    expect(channel).toBeNull();
  });

  it("throws on API error", async () => {
    mockFetchError(403, "forbidden");
    await expect(resolveChannel(config, { type: "id", value: "UC_xxxxxxxxxxxxxxxxxxxx" })).rejects.toThrow();
  });
});

describe("fetchRecentVideos", () => {
  const config: YouTubeApiConfig = { apiKey: "test-key" };

  beforeEach(() => { vi.restoreAllMocks(); });

  it("fetches recent videos from a playlist", async () => {
    mockFetch({
      items: [
        {
          contentDetails: { videoId: "vid1" },
          snippet: {
            title: "Video One",
            channelTitle: "Channel A",
            channelId: "UC_xxxxxxxxxxxxxxxxxxxx",
            thumbnails: { medium: { url: "https://example.com/v1.jpg" } },
            publishedAt: "2026-05-23T10:00:00Z",
          },
        },
        {
          contentDetails: { videoId: "vid2" },
          snippet: {
            title: "Video Two",
            channelTitle: "Channel A",
            channelId: "UC_xxxxxxxxxxxxxxxxxxxx",
            thumbnails: { medium: { url: "https://example.com/v2.jpg" } },
            publishedAt: "2026-05-22T10:00:00Z",
          },
        },
      ],
    });

    const videos = await fetchRecentVideos(config, "UU_xxxxxxxxxxxxxxxxxxxx", 5);
    expect(videos).toHaveLength(2);
    expect(videos[0]).toEqual({
      videoId: "vid1",
      title: "Video One",
      channelTitle: "Channel A",
      channelId: "UC_xxxxxxxxxxxxxxxxxxxx",
      thumbnailUrl: "https://example.com/v1.jpg",
      publishedAt: "2026-05-23T10:00:00Z",
      watchUrl: "https://www.youtube.com/watch?v=vid1",
    });
  });

  it("skips items without videoId", async () => {
    mockFetch({
      items: [
        { contentDetails: {}, snippet: { title: "Deleted", channelTitle: "C", channelId: "UC_x", thumbnails: {}, publishedAt: "2026-05-23T10:00:00Z" } },
        { contentDetails: { videoId: "vid1" }, snippet: { title: "Valid", channelTitle: "C", channelId: "UC_x", thumbnails: { medium: { url: "http://t.jpg" } }, publishedAt: "2026-05-23T10:00:00Z" } },
      ],
    });

    const videos = await fetchRecentVideos(config, "UU_xxxxxxxxxxxxxxxxxxxx", 5);
    expect(videos).toHaveLength(1);
    expect(videos[0].videoId).toBe("vid1");
  });
});
