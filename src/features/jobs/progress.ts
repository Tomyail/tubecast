import type { JobProgressPhase, JobResponse } from "./api";
import type { TFunction } from "i18next";

export type DownloadState = "idle" | "downloading" | "done" | "error";
export type CacheProgressState = "idle" | "caching" | "cached" | "error";

export interface HomeProgressInfo {
  title: string;
  detail: string;
  activeStep: number; // 0-based index into PROGRESS_STEPS
}

export interface FeedProgressLabel {
  label: string;
}

const legacyHomeCopy: Record<string, string> = {
  "progress.playable": "可播放", "progress.cachingToDevice": "正在后台缓存到手机", "progress.cached": "已缓存", "progress.availableOffline": "可离线播放", "progress.cacheFailedStreaming": "缓存失败，仍可在线播放", "progress.retrying": "重试中", "progress.retryingDetail": "上次尝试失败，正在自动重试", "progress.queued": "排队中", "progress.queuedDetail": "等待转换服务接收任务", "progress.preparing": "准备转换", "progress.preparingDetail": "正在准备音频转换", "progress.downloading": "下载中", "progress.downloadingDetail": "正在从 YouTube 获取音频", "progress.transcoding": "转码中", "progress.transcodingDetail": "正在转换为可播放格式", "progress.saving": "保存中", "progress.savingDetail": "正在保存音频文件", "progress.processing": "处理中",
};

export const PROGRESS_STEPS = ["queued", "download", "transcode", "save", "playable"] as const;

const KNOWN_PHASES: JobProgressPhase[] = [
  "queued",
  "starting",
  "downloading",
  "transcoding",
  "uploading",
  "ready",
];

export function normalizeProgressPhase(
  job: Pick<JobResponse, "status" | "progressPhase">,
): JobProgressPhase {
  const phase = job.progressPhase;
  if (phase != null && KNOWN_PHASES.includes(phase as JobProgressPhase)) {
    return phase as JobProgressPhase;
  }
  if (phase != null && phase !== "") {
    // Unknown phase — generic processing display
    return "starting";
  }
  // Missing or null — fall back from status
  if (job.status === "queued") return "queued";
  if (job.status === "processing") return "starting";
  if (job.status === "ready") return "ready";
  return "starting";
}

function isRetry(
  job: Pick<JobResponse, "attemptCount" | "lastErrorMessage">,
): boolean {
  return job.attemptCount > 0 && job.lastErrorMessage != null;
}

export function getHomeProgressInfo(
  job: Pick<
    JobResponse,
    "status" | "progressPhase" | "attemptCount" | "lastErrorMessage"
  >,
  cacheState: CacheProgressState,
  t?: TFunction,
): HomeProgressInfo {
  const translate = t ?? ((key: string) => legacyHomeCopy[key] ?? key);
  if (cacheState === "caching") {
    return { title: translate("progress.playable"), detail: translate("progress.cachingToDevice"), activeStep: 4 };
  }
  if (cacheState === "cached") {
    return { title: translate("progress.cached"), detail: translate("progress.availableOffline"), activeStep: 4 };
  }
  if (cacheState === "error") {
    return { title: translate("progress.playable"), detail: translate("progress.cacheFailedStreaming"), activeStep: 4 };
  }

  const phase = normalizeProgressPhase(job);

  switch (phase) {
    case "queued":
      if (isRetry(job)) {
        return { title: translate("progress.retrying"), detail: translate("progress.retryingDetail"), activeStep: 0 };
      }
      return { title: translate("progress.queued"), detail: translate("progress.queuedDetail"), activeStep: 0 };
    case "starting":
      return { title: translate("progress.preparing"), detail: translate("progress.preparingDetail"), activeStep: 0 };
    case "downloading":
      return { title: translate("progress.downloading"), detail: translate("progress.downloadingDetail"), activeStep: 1 };
    case "transcoding":
      return { title: translate("progress.transcoding"), detail: translate("progress.transcodingDetail"), activeStep: 2 };
    case "uploading":
      return { title: translate("progress.saving"), detail: translate("progress.savingDetail"), activeStep: 3 };
    case "ready":
      return { title: translate("progress.playable"), detail: translate("progress.cachingToDevice"), activeStep: 4 };
    default: {
      const _exhaustive: never = phase;
      void _exhaustive;
      return { title: translate("progress.processing"), detail: "", activeStep: 0 };
    }
  }
}

export function getFeedProgressLabel(
  job: Pick<
    JobResponse,
    "status" | "progressPhase" | "attemptCount" | "lastErrorMessage"
  >,
  t?: TFunction,
): FeedProgressLabel {
  const translate = t ?? ((key: string) => key === "progress.preparing" ? "准备中" : legacyHomeCopy[key] ?? (key === "progress.ready" ? "已完成" : key));
  const phase = normalizeProgressPhase(job);

  if (phase === "queued" && isRetry(job)) {
    return { label: translate("progress.retrying") };
  }

  switch (phase) {
    case "queued":
      return { label: translate("progress.queued") };
    case "starting":
      return { label: translate("progress.preparing") };
    case "downloading":
      return { label: translate("progress.downloading") };
    case "transcoding":
      return { label: translate("progress.transcoding") };
    case "uploading":
      return { label: translate("progress.saving") };
    case "ready":
      return { label: translate("progress.ready") };
    default: {
      const _exhaustive: never = phase;
      void _exhaustive;
      return { label: translate("progress.processing") };
    }
  }
}
