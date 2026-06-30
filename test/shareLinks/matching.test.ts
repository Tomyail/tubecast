import { describe, expect, it } from "vitest";
import type { Track } from "../../src/features/playlist/storage";
import { findTrackForSourceUrl } from "../../src/features/shareLinks/matching";

const makeTrack = (sourceUrl: string): Track => ({
  id: sourceUrl,
  jobId: sourceUrl,
  title: "Track",
  durationSeconds: 1,
  thumbnailUrl: "",
  localPath: null,
  localFilename: null,
  sourceUrl,
  fileSize: null,
  contentType: "audio/mp4",
  downloadedAt: null,
  cacheStatus: "none",
  cacheError: null,
  playCount: 0,
  lastPlayedAt: null,
  channelId: null,
  channelName: null,
});

describe("findTrackForSourceUrl", () => {
  it("matches equivalent YouTube video URLs by video id", () => {
    const track = makeTrack("https://www.youtube.com/watch?v=abc");

    expect(findTrackForSourceUrl([track], "https://youtu.be/abc?t=12")).toBe(track);
  });

  it("falls back to exact source URL matching", () => {
    const track = makeTrack("https://example.com/audio");

    expect(findTrackForSourceUrl([track], "https://example.com/audio")).toBe(track);
  });
});
