import axios, { type AxiosError, type AxiosResponse } from "axios";
import { SERVER_URL } from "../features/settings/storage";
import { ApiError, AudioExpiredError, RateLimitError } from "./errors";

// Default request timeout. Prevents the pull-to-refresh spinner from hanging
// forever when the connection stalls — axios rejects after this and React
// Query clears its `isRefetching` state.
const DEFAULT_TIMEOUT_MS = 15_000;

export const apiClient = axios.create({
  baseURL: SERVER_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const candidate =
      (payload as { message?: unknown }).message ??
      (payload as { error?: { message?: unknown } }).error?.message;
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return fallback;
}

// Map non-2xx responses to the shared error types so call sites and React
// Query see consistent, typed errors. This keeps AudioExpiredError (410)
// working for the `instanceof` check in features/player/context.tsx.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 410) {
      const message = extractMessage(error.response?.data, "Audio has expired");
      return Promise.reject(new AudioExpiredError(message));
    }

    if (status === 429) {
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      const retryAfter = Number.parseInt(String(retryAfterHeader ?? "60"), 10);
      return Promise.reject(new RateLimitError(Number.isNaN(retryAfter) ? 60 : retryAfter));
    }

    if (error.response) {
      const message = extractMessage(error.response.data, `Request failed with status ${status}`);
      return Promise.reject(new ApiError(status ?? 0, message));
    }

    // Network error, timeout (ECONNABORTED / ETIMEDOUT), or cancellation.
    // Surface axios' message (e.g. "timeout of 15000ms exceeded") as a plain
    // Error so downstream `.message` reads keep working.
    return Promise.reject(new Error(error.message || "Network request failed"));
  }
);
