import { SERVER_URL } from "../settings/storage";

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 410) {
    const body = await res.json();
    throw new AudioExpiredError(body.message || "Audio has expired");
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new RateLimitError(parseInt(retryAfter || "60"));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message || body.error || "Request failed");
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class AudioExpiredError extends Error {
  constructor(message: string) { super(message); }
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) { super("Rate limited"); }
}

export async function submitJob(sourceUrl: string): Promise<{ id: string; status: string; sourceUrl: string }> {
  return request("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ sourceUrl }),
  });
}

export async function getJob(id: string): Promise<JobResponse> {
  return request(`/api/jobs/${id}`);
}

export async function getDownloadUrl(id: string): Promise<string> {
  const res = await request<{ url: string }>(`/api/jobs/${id}/download`);
  return res.url;
}

export async function fetchLibrary(): Promise<JobResponse[]> {
  const res = await request<{ jobs: JobResponse[] }>("/api/library?limit=50");
  return res.jobs;
}

export async function hideLibraryItem(jobId: string): Promise<{ hidden: boolean }> {
  return request(`/api/library/${jobId}`, { method: "DELETE" });
}
