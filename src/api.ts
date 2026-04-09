import type {
  CreateJobResult,
  GenerateSummaryResult,
  Job,
  JobStatus,
  LibraryJob,
  ServerConfig,
  SummaryStreamEvent,
} from "./types";

function buildHeaders(config: ServerConfig, extras?: Record<string, string>) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extras,
  };

  if (config.authToken.trim()) {
    headers.Authorization = `Bearer ${config.authToken.trim()}`;
  }

  if (config.deviceId.trim()) {
    headers["X-Device-Id"] = config.deviceId.trim();
  }

  if (config.viewerId.trim()) {
    headers["X-Viewer-Id"] = config.viewerId.trim();
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

function parseJsonText(text: string) {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

export async function fetchLibrary(config: ServerConfig): Promise<LibraryJob[]> {
  const payload = await request<{ jobs: LibraryJob[] }>(config, "/api/library?limit=50");
  return payload.jobs;
}

export async function hideLibraryItem(config: ServerConfig, jobId: string): Promise<{ hidden: boolean }> {
  return request<{ hidden: boolean }>(config, `/api/library/${jobId}`, {
    method: "DELETE",
  });
}

export async function markLibraryItemPlayed(config: ServerConfig, jobId: string): Promise<{ updated: boolean }> {
  return request<{ updated: boolean }>(config, `/api/library/${jobId}/played`, {
    method: "POST",
  });
}

export async function generateJobSummary(config: ServerConfig, id: string): Promise<GenerateSummaryResult> {
  return request<GenerateSummaryResult>(config, `/api/jobs/${id}/summary`, {
    method: "POST",
  });
}

export function streamJobSummary(
  config: ServerConfig,
  id: string,
  callbacks: {
    onEvent: (event: SummaryStreamEvent) => void;
    onError?: (message: string) => void;
    onClose?: () => void;
  },
) {
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let buffer = "";
  let closed = false;

  function closeOnce() {
    if (closed) {
      return;
    }

    closed = true;
    callbacks.onClose?.();
  }

  function emitError(message: string) {
    callbacks.onError?.(message);
  }

  function processBuffer() {
    const incoming = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    buffer += incoming;

    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary === -1) {
        return;
      }

      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const dataLines = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length === 0) {
        continue;
      }

      const payload = parseJsonText(dataLines.join("\n"));
      if (payload) {
        callbacks.onEvent(payload as SummaryStreamEvent);
      }
    }
  }

  xhr.open("POST", buildUrl(config, `/api/jobs/${id}/summary/stream`));

  for (const [key, value] of Object.entries(buildHeaders(config, {
    Accept: "text/event-stream",
  }))) {
    xhr.setRequestHeader(key, value);
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }

    processBuffer();

    if (xhr.status < 200 || xhr.status >= 300) {
      const payload = parseJsonText(xhr.responseText);
      emitError(
        payload && typeof payload.error === "string"
          ? payload.error
          : `Request failed with status ${xhr.status}`,
      );
    }

    closeOnce();
  };

  xhr.onprogress = () => {
    processBuffer();
  };

  xhr.onerror = () => {
    emitError("Network request failed");
    closeOnce();
  };

  xhr.onabort = () => {
    closeOnce();
  };

  xhr.send();

  return {
    abort() {
      xhr.abort();
    },
  };
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
