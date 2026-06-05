import type { FeedItem, FeedItemWithStatus } from "./types";

export type JobLookup = Record<string, { status: string; jobId: string }>;

export function mergeAndSortItems(
  sourceItems: FeedItem[][],
  maxItems = 100,
): FeedItem[] {
  const all = sourceItems.flat();
  const seen = new Set<string>();
  const unique = all.filter((v) => {
    const key = `${v.platform}:${v.platformItemId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return unique.slice(0, maxItems);
}

export function matchJobStatus(
  videos: FeedItem[],
  jobLookup: JobLookup,
): FeedItemWithStatus[] {
  return videos.map((video) => {
    const job = jobLookup[video.platformItemId];
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
