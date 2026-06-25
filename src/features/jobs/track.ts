import type { JobResponse } from "./api";
import type { Track, TrackCacheStatus } from "../playlist/storage";

export function trackFromReadyJob(
  job: JobResponse,
  cacheStatus: TrackCacheStatus = "none",
): Track {
  return {
    id: job.id,
    jobId: job.id,
    title: job.title || "",
    durationSeconds: job.durationSeconds || 0,
    thumbnailUrl: job.thumbnailUrl || "",
    localPath: null,
    localFilename: null,
    sourceUrl: job.sourceUrl,
    fileSize: job.audioFileSize ?? null,
    contentType: job.contentType || "audio/mp4",
    downloadedAt: null,
    cacheStatus,
    cacheError: null,
    playCount: 0,
    lastPlayedAt: null,
    channelId: job.channelId ?? null,
    channelName: job.channelName ?? null,
  };
}
