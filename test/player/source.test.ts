import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "../../src/features/playlist/storage";

const existingFiles = new Set<string>();
const getDownloadUrl = vi.fn((jobId: string) => Promise.resolve(`https://example.com/${jobId}.m4a`));

class AudioExpiredError extends Error {}

vi.mock("expo-audio", () => ({
  setAudioModeAsync: vi.fn(),
  useAudioPlayer: vi.fn(),
  useAudioPlayerStatus: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../../src/features/jobs/api", () => ({
  AudioExpiredError,
  getDownloadUrl: (jobId: string) => getDownloadUrl(jobId),
  getJob: vi.fn(),
}));

vi.mock("expo-file-system", () => ({
  Paths: { document: "file:///documents" },
  Directory: class Directory {
    uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
  },
  File: class File {
    uri: string;
    name: string;
    constructor(dir: { uri: string }, name: string) {
      this.name = name;
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return existingFiles.has(this.uri);
    }
  },
}));

const { isAudioMetadataReady, playbackErrorMessage, resolveCachedLocalUri, resolveTrackSource } = await import(
  "../../src/features/player/context"
);

const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  id: "job-1",
  jobId: "job-1",
  title: "A track",
  durationSeconds: 120,
  thumbnailUrl: "",
  localPath: null,
  localFilename: null,
  sourceUrl: "https://youtube.com/watch?v=1",
  fileSize: null,
  contentType: "audio/mp4",
  downloadedAt: null,
  cacheStatus: "none",
  cacheError: null,
  playCount: 0,
  lastPlayedAt: null,
  ...overrides,
});

describe("player source resolution", () => {
  beforeEach(() => {
    existingFiles.clear();
    getDownloadUrl.mockClear();
  });

  it("uses the cached local file when present", async () => {
    existingFiles.add("file:///documents/audio/job-1.m4a");
    const track = makeTrack({
      localPath: "file:///documents/audio/job-1.m4a",
      localFilename: "job-1.m4a",
      cacheStatus: "cached",
    });

    await expect(resolveTrackSource(track)).resolves.toEqual({
      uri: "file:///documents/audio/job-1.m4a",
      source: "local",
    });
    expect(getDownloadUrl).not.toHaveBeenCalled();
  });

  it("requests a remote URL only when the local file is missing", async () => {
    const track = makeTrack();

    await expect(resolveTrackSource(track)).resolves.toEqual({
      uri: "https://example.com/job-1.m4a",
      source: "remote",
    });
    expect(resolveCachedLocalUri(track)).toBeNull();
    expect(getDownloadUrl).toHaveBeenCalledWith("job-1");
  });

  it("maps expired remote playback without local cache to a reconvert message", () => {
    expect(playbackErrorMessage(new AudioExpiredError("expired"))).toBe("音频已过期，请重新转换");
  });

  it("treats 0:00 / 0:00 as not ready while audio metadata is still loading", () => {
    expect(isAudioMetadataReady(0, 0)).toBe(false);
    expect(isAudioMetadataReady(120, 0)).toBe(true);
    expect(isAudioMetadataReady(0, 1)).toBe(true);
  });
});
