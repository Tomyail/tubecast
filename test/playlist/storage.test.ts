import { beforeEach, describe, expect, it, vi } from "vitest";

const store: Record<string, string> = {};
const existingFiles = new Set<string>();

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

const { getAllTracks } = await import("../../src/features/playlist/storage");

const TRACKS_KEY = "playlist_tracks";

function storeTracks(tracks: Record<string, Record<string, unknown>>) {
  store[TRACKS_KEY] = JSON.stringify(tracks);
}

function baseTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    jobId: "job-1",
    title: "A track",
    durationSeconds: 120,
    thumbnailUrl: "https://example.com/thumb.jpg",
    sourceUrl: "https://youtube.com/watch?v=1",
    contentType: "audio/mp4",
    playCount: 0,
    lastPlayedAt: null,
    ...overrides,
  };
}

describe("playlist storage track migration", () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    existingFiles.clear();
  });

  it("loads a legacy track with localPath as cached", async () => {
    storeTracks({
      "job-1": baseTrack({
        localPath: "file:///documents/audio/job-1.m4a",
        localFilename: "job-1.m4a",
        fileSize: 1234,
        downloadedAt: "2026-06-14T00:00:00Z",
      }),
    });
    existingFiles.add("file:///documents/audio/job-1.m4a");

    const tracks = await getAllTracks();

    expect(tracks[0]).toMatchObject({
      localPath: "file:///documents/audio/job-1.m4a",
      localFilename: "job-1.m4a",
      cacheStatus: "cached",
      fileSize: 1234,
    });
  });

  it("loads a remote-only playable track with cacheStatus none", async () => {
    storeTracks({
      "job-1": baseTrack({
        localPath: null,
        localFilename: null,
        fileSize: null,
        downloadedAt: null,
      }),
    });

    const tracks = await getAllTracks();

    expect(tracks[0]).toMatchObject({
      localPath: null,
      localFilename: null,
      fileSize: null,
      downloadedAt: null,
      cacheStatus: "none",
    });
  });

  it("downgrades cached tracks when the local file is missing", async () => {
    storeTracks({
      "job-1": baseTrack({
        localPath: "file:///documents/audio/job-1.m4a",
        localFilename: "job-1.m4a",
        fileSize: 1234,
        downloadedAt: "2026-06-14T00:00:00Z",
        cacheStatus: "cached",
      }),
    });

    const tracks = await getAllTracks();

    expect(tracks[0]).toMatchObject({
      localPath: null,
      localFilename: null,
      downloadedAt: null,
      cacheStatus: "none",
    });
  });

  it("defaults channelId/channelName to null for legacy persisted tracks", async () => {
    // A track persisted before channelId/channelName existed has neither field.
    storeTracks({
      "job-1": baseTrack(),
    });

    const tracks = await getAllTracks();

    expect(tracks[0]).toMatchObject({
      channelId: null,
      channelName: null,
    });
  });

  it("preserves channelId/channelName when present on a persisted track", async () => {
    storeTracks({
      "job-1": baseTrack({
        channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
        channelName: "Google Developers",
      }),
    });

    const tracks = await getAllTracks();

    expect(tracks[0]).toMatchObject({
      channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
      channelName: "Google Developers",
    });
  });
});
