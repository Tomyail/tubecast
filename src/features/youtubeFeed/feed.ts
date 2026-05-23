import type { FeedVideo, FeedVideoWithStatus } from "./types";

export type JobLookup = Record<string, { status: string; jobId: string }>;

export function mergeAndSortVideos(
  channelVideos: FeedVideo[][],
  maxItems = 100,
): FeedVideo[] {
  const all = channelVideos.flat();
  const seen = new Set<string>();
  const unique = all.filter((v) => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
  unique.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return unique.slice(0, maxItems);
}

export function matchJobStatus(
  videos: FeedVideo[],
  jobLookup: JobLookup,
): FeedVideoWithStatus[] {
  return videos.map((video) => {
    const job = jobLookup[video.videoId];
    if (!job) {
      return { ...video, status: "new" as const };
    }
    if (job.status === "ready") {
      return { ...video, status: "ready" as const, jobId: job.jobId };
    }
    if (job.status === "processing" || job.status === "queued") {
      return { ...video, status: "converting" as const, jobId: job.jobId };
    }
    // failed or other — allow retry
    return { ...video, status: "new" as const };
  });
}
