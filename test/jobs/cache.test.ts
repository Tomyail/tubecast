import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobResponse } from "../../src/features/jobs/api";

const files = new Map<string, number>();
const downloadCalls: string[] = [];
let downloadShouldFail = false;

const getDownloadUrl = vi.fn((jobId: string) => Promise.resolve(`https://example.com/${jobId}.m4a`));

vi.mock("../../src/features/jobs/api", () => ({
  getDownloadUrl: (jobId: string) => getDownloadUrl(jobId),
}));

vi.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
    get exists() {
      return true;
    }
    create() {}
  }

  class File {
    uri: string;
    name: string;
    constructor(dir: { uri: string }, name: string) {
      this.name = name;
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri) ?? 0;
    }
    delete() {
      files.delete(this.uri);
    }
    move(destination: File) {
      const size = files.get(this.uri) ?? 0;
      files.delete(this.uri);
      files.set(destination.uri, size);
    }
    static async downloadFileAsync(url: string, file: File) {
      downloadCalls.push(url);
      if (downloadShouldFail) {
        files.set(file.uri, 99);
        throw new Error("network failed");
      }
      files.set(file.uri, 1234);
    }
  }

  return {
    Paths: { document: "file:///documents" },
    Directory,
    File,
  };
});

const { ensureTrackCached, __resetCacheDownloadsForTest } = await import("../../src/features/jobs/cache");

const makeJob = (overrides: Partial<JobResponse> = {}): JobResponse => ({
  id: "job-1",
  status: "ready",
  sourceUrl: "https://youtube.com/watch?v=1",
  title: "A track",
  durationSeconds: 120,
  thumbnailUrl: "https://example.com/thumb.jpg",
  channelId: null,
  channelName: null,
  sourceId: null,
  audioFormat: "m4a",
  contentType: "audio/mp4",
  audioFileSize: 1234,
  audioExpiresAt: null,
  attemptCount: 0,
  errorMessage: null,
  lastErrorMessage: null,
  createdAt: "2026-06-14T00:00:00Z",
  startedAt: null,
  finishedAt: null,
  progressPhase: "ready",
  progressUpdatedAt: null,
  ...overrides,
});

describe("ensureTrackCached", () => {
  beforeEach(() => {
    files.clear();
    downloadCalls.length = 0;
    downloadShouldFail = false;
    getDownloadUrl.mockClear();
    __resetCacheDownloadsForTest();
  });

  it("shares the same underlying download for concurrent calls with the same jobId", async () => {
    const job = makeJob();

    const [first, second] = await Promise.all([
      ensureTrackCached(job),
      ensureTrackCached(job),
    ]);

    expect(getDownloadUrl).toHaveBeenCalledTimes(1);
    expect(downloadCalls).toEqual(["https://example.com/job-1.m4a"]);
    expect(first.localPath).toBe("file:///documents/audio/job-1.m4a");
    expect(second.localPath).toBe(first.localPath);
    expect(files.has("file:///documents/audio/job-1.m4a.tmp")).toBe(false);
  });

  it("returns an existing final file without requesting a download URL", async () => {
    files.set("file:///documents/audio/job-1.m4a", 1234);

    const track = await ensureTrackCached(makeJob());

    expect(getDownloadUrl).not.toHaveBeenCalled();
    expect(downloadCalls).toEqual([]);
    expect(track).toMatchObject({
      localPath: "file:///documents/audio/job-1.m4a",
      localFilename: "job-1.m4a",
      cacheStatus: "cached",
    });
  });

  it("clears the in-flight entry after failure so a later retry can start", async () => {
    downloadShouldFail = true;
    await expect(ensureTrackCached(makeJob())).rejects.toThrow("network failed");

    downloadShouldFail = false;
    const track = await ensureTrackCached(makeJob());

    expect(getDownloadUrl).toHaveBeenCalledTimes(2);
    expect(downloadCalls).toEqual([
      "https://example.com/job-1.m4a",
      "https://example.com/job-1.m4a",
    ]);
    expect(track.cacheStatus).toBe("cached");
  });

  it("deletes the tmp file on failure", async () => {
    downloadShouldFail = true;

    await expect(ensureTrackCached(makeJob())).rejects.toThrow("network failed");

    expect(files.has("file:///documents/audio/job-1.m4a.tmp")).toBe(false);
    expect(files.has("file:///documents/audio/job-1.m4a")).toBe(false);
  });
});
