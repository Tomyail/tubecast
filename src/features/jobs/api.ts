import { apiClient } from "../../shared/apiClient";
import { ApiError, AudioExpiredError, RateLimitError } from "../../shared/errors";

// Re-exported so existing imports (e.g. player/context.tsx uses
// `instanceof AudioExpiredError`) keep working without churn.
export { ApiError, AudioExpiredError, RateLimitError };

export type JobProgressPhase =
  | "queued"
  | "starting"
  | "downloading"
  | "transcoding"
  | "uploading"
  | "ready";

export interface JobResponse {
  id: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  sourceUrl: string;
  title: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  channelId: string | null;
  channelName: string | null;
  sourceId: string | null;
  audioFormat: string | null;
  contentType: string | null;
  audioFileSize: number | null;
  audioExpiresAt: string | null;
  attemptCount: number;
  errorMessage: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  progressPhase?: JobProgressPhase | string | null;
  progressUpdatedAt?: string | null;
}

async function request<T>(path: string, options: { method?: string; data?: unknown } = {}): Promise<T> {
  const res = await apiClient.request<T>({
    url: path,
    method: options.method ?? "GET",
    data: options.data,
  });
  return res.data;
}

export async function submitJob(sourceUrl: string): Promise<{ id: string; status: string; sourceUrl: string }> {
  return request("/api/jobs", {
    method: "POST",
    data: { sourceUrl },
  });
}

export async function getJob(id: string): Promise<JobResponse> {
  return request(`/api/jobs/${id}`);
}

export async function getDownloadUrl(id: string): Promise<string> {
  const res = await request<{ url: string }>(`/api/jobs/${id}/download`);
  return res.url;
}
