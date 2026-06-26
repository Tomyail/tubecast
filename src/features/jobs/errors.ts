import type { TFunction } from "i18next";
import type { JobResponse } from "./api";

const LIVE_UNSUPPORTED_PATTERNS = [
  /\blive\b/i,
  /live\s*stream/i,
  /livestream/i,
  /is\s+live/i,
  /upcoming/i,
  /premiere/i,
  /直播/,
];

export function isLiveUnsupportedError(message: string | null | undefined): boolean {
  if (!message) return false;
  return LIVE_UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(message));
}

export function isLiveUnsupportedJob(
  job: Pick<JobResponse, "errorMessage" | "lastErrorMessage"> | null | undefined,
): boolean {
  return isLiveUnsupportedError(job?.errorMessage) || isLiveUnsupportedError(job?.lastErrorMessage);
}

export function getConversionFailureMessage(
  job: Pick<JobResponse, "errorMessage" | "lastErrorMessage"> | null | undefined,
  t: TFunction,
): string | null {
  if (isLiveUnsupportedJob(job)) return t("errors.liveUnsupported");
  return job?.errorMessage || job?.lastErrorMessage || null;
}
