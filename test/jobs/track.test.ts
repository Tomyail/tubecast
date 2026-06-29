import { describe, expect, it } from "vitest";
import type { JobResponse } from "../../src/features/jobs/api";
import { playableTrackFromReadyJob, trackFromReadyJob } from "../../src/features/jobs/track";
import type { Track } from "../../src/features/playlist/storage";

const readyJob: JobResponse = {
  id: "job-1",
  status: "ready",
  sourceUrl: "https://youtube.com/watch?v=abc123DEF_4",
  title: "A track",
  durationSeconds: 120,
  thumbnailUrl: "https://example.com/thumb.jpg",
  channelId: "UC_1",
  channelName: "Channel One",
  sourceId: "abc123DEF_4",
  audioFormat: "m4a",
  contentType: "audio/mp4",
  audioFileSize: 1234,
  audioExpiresAt: "2026-06-29 12:00:00",
  attemptCount: 1,
  errorMessage: null,
  lastErrorMessage: null,
  createdAt: "2026-06-29T00:00:00Z",
  startedAt: "2026-06-29T00:00:01Z",
  finishedAt: "2026-06-29T00:00:02Z",
};

const cachedTrack: Track = {
  id: "job-1",
  jobId: "job-1",
  title: "Cached track",
  durationSeconds: 120,
  thumbnailUrl: "https://example.com/thumb.jpg",
  localPath: "file:///documents/audio/job-1.m4a",
  localFilename: "job-1.m4a",
  sourceUrl: "https://youtube.com/watch?v=abc123DEF_4",
  fileSize: 1234,
  contentType: "audio/mp4",
  downloadedAt: "2026-06-29T00:00:03Z",
  cacheStatus: "cached",
  cacheError: null,
  playCount: 2,
  lastPlayedAt: "2026-06-29T00:00:04Z",
  channelId: "UC_1",
  channelName: "Channel One",
};

describe("job track helpers", () => {
  it("preserves an existing playlist track for a ready job", () => {
    expect(playableTrackFromReadyJob(readyJob, [cachedTrack])).toBe(cachedTrack);
  });

  it("reuses a cached playlist track for the same YouTube video when job ids differ", () => {
    const newerJob = { ...readyJob, id: "job-2", sourceUrl: "https://www.youtube.com/watch?v=abc123DEF_4&t=10" };

    expect(playableTrackFromReadyJob(newerJob, [{ ...cachedTrack, jobId: "job-1" }])).toMatchObject({
      jobId: "job-1",
      localPath: "file:///documents/audio/job-1.m4a",
      localFilename: "job-1.m4a",
      cacheStatus: "cached",
    });
  });

  it("matches short YouTube URLs to the same source id", () => {
    const shortUrlTrack = {
      ...cachedTrack,
      jobId: "job-old",
      sourceUrl: "https://youtu.be/abc123DEF_4",
    };

    expect(playableTrackFromReadyJob({ ...readyJob, id: "job-new" }, [shortUrlTrack])).toBe(shortUrlTrack);
  });

  it("falls back to a remote-only track when the job is not in the playlist", () => {
    expect(playableTrackFromReadyJob(readyJob, [])).toEqual(trackFromReadyJob(readyJob));
  });
});
