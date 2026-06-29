import type { JobResponse } from "./api";
import type { Track, TrackCacheStatus } from "../playlist/storage";

function youtubeVideoIdFromUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const embedMatch = url.pathname.match(/^\/embed\/([^/]+)\/?$/);
      return embedMatch?.[1] ?? null;
    }
  } catch {}
  return null;
}

function sourceIdForTrack(track: Track): string | null {
  return youtubeVideoIdFromUrl(track.sourceUrl);
}

function sourceIdForJob(job: JobResponse): string | null {
  return job.sourceId || youtubeVideoIdFromUrl(job.sourceUrl);
}

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

export function playableTrackFromReadyJob(job: JobResponse, tracks: Track[]): Track {
  const sameJobTrack = tracks.find((track) => track.jobId === job.id);
  if (sameJobTrack) return sameJobTrack;

  const jobSourceId = sourceIdForJob(job);
  if (jobSourceId) {
    const sameSourceTrack = tracks.find((track) => sourceIdForTrack(track) === jobSourceId);
    if (sameSourceTrack) return sameSourceTrack;
  }

  return trackFromReadyJob(job);
}
