import type { CreateJobResult, Job, JobStatus, ServerConfig } from "./types";

function buildHeaders(config: ServerConfig, extras?: Record<string, string>) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extras,
  };

  if (config.authToken.trim()) {
    headers.Authorization = `Bearer ${config.authToken.trim()}`;
  }

  return headers;
}

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildUrl(config: ServerConfig, pathname: string) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new Error("Server base URL is required");
  }

  return `${baseUrl}${pathname}`;
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid JSON (${response.status})`);
  }
}

async function request<T>(config: ServerConfig, pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(config, pathname), {
    ...init,
    headers: {
      ...buildHeaders(config),
      ...(init?.headers || {}),
    },
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchJobs(config: ServerConfig): Promise<Job[]> {
  const payload = await request<{ jobs: Job[] }>(config, "/api/jobs?limit=25");
  return payload.jobs;
}

export async function fetchJob(config: ServerConfig, id: string): Promise<Job> {
  const payload = await request<{ job: Job }>(config, `/api/jobs/${id}`);
  return payload.job;
}

export async function createJob(
  config: ServerConfig,
  input: { sourceUrl: string; idempotencyKey?: string | null },
): Promise<CreateJobResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (input.idempotencyKey?.trim()) {
    headers["Idempotency-Key"] = input.idempotencyKey.trim();
  }

  return request<CreateJobResult>(config, "/api/jobs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sourceUrl: input.sourceUrl.trim(),
    }),
  });
}

export async function deleteJob(config: ServerConfig, id: string): Promise<{ deleted: boolean; job: Job }> {
  return request<{ deleted: boolean; job: Job }>(config, `/api/jobs/${id}`, {
    method: "DELETE",
  });
}

export function getPlayableAudioUrl(job: Job | null | undefined, config: ServerConfig) {
  if (!job?.audioHref && !job?.audioUrl) {
    return null;
  }

  const rawUrl = job.audioUrl || job.audioHref;
  if (!rawUrl) {
    return null;
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    return null;
  }

  const url = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? new URL(rawUrl)
    : new URL(rawUrl, `${baseUrl}/`);

  if (config.authToken.trim()) {
    url.searchParams.set("token", config.authToken.trim());
  }

  return url.toString();
}

export function getYouTubeTimestampUrl(sourceUrl: string | null | undefined, currentTimeSeconds: number) {
  if (!sourceUrl?.trim()) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  const seconds = Math.max(0, Math.floor(currentTimeSeconds));
  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "youtu.be" ||
    hostname === "www.youtu.be" ||
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com"
  ) {
    url.searchParams.delete("t");
    url.searchParams.delete("start");
    url.searchParams.set("t", String(seconds));
  }

  return url.toString();
}

export function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return "--:--";
  }

  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function isJobTerminal(status: JobStatus) {
  return status === "ready" || status === "failed";
}
