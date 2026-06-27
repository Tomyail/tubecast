import { describe, expect, it } from "vitest";
import type { Track } from "../../src/features/playlist/storage";
import { getPlaylistFilterCounts, getVisiblePlaylistTracks, isUnplayedTrack } from "../../src/screens/playlistFilter";

const makeTrack = (id: string, playCount: number): Track => ({
  id,
  jobId: id,
  title: id,
  durationSeconds: 60,
  thumbnailUrl: "",
  localPath: null,
  localFilename: null,
  sourceUrl: `https://youtube.com/watch?v=${id}`,
  fileSize: null,
  contentType: "audio/mp4",
  downloadedAt: null,
  cacheStatus: "none",
  cacheError: null,
  playCount,
  lastPlayedAt: playCount > 0 ? "2026-06-27T00:00:00.000Z" : null,
  channelId: null,
  channelName: null,
});

describe("playlist filter", () => {
  const tracks = [makeTrack("new", 0), makeTrack("finished", 1), makeTrack("replayed", 3)];

  it("treats only tracks with playCount 0 as unplayed", () => {
    expect(isUnplayedTrack(makeTrack("new", 0))).toBe(true);
    expect(isUnplayedTrack(makeTrack("finished", 1))).toBe(false);
  });

  it("returns all tracks for the all filter", () => {
    expect(getVisiblePlaylistTracks(tracks, "all")).toEqual(tracks);
  });

  it("returns only unplayed tracks for the unplayed filter", () => {
    expect(getVisiblePlaylistTracks(tracks, "unplayed").map((track) => track.id)).toEqual(["new"]);
  });

  it("counts all and unplayed tracks", () => {
    expect(getPlaylistFilterCounts(tracks)).toEqual({ all: 3, unplayed: 1 });
  });
});
