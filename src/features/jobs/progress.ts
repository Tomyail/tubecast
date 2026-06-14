import type { JobProgressPhase, JobResponse } from "./api";

export type DownloadState = "idle" | "downloading" | "done" | "error";

export interface HomeProgressInfo {
  title: string;
  detail: string;
  activeStep: number; // 0-based index into PROGRESS_STEPS
}

export interface FeedProgressLabel {
  label: string;
}

export const PROGRESS_STEPS = ["排队", "下载", "转码", "保存", "到手机"] as const;

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
  downloadState: DownloadState,
): HomeProgressInfo {
  // downloadState takes priority for the final two steps
  if (downloadState === "downloading") {
    return { title: "下载到手机", detail: "正在保存到本机播放列表", activeStep: 4 };
  }
  if (downloadState === "done") {
    return { title: "已完成", detail: "已加入播放列表", activeStep: 4 };
  }

  const phase = normalizeProgressPhase(job);

  switch (phase) {
    case "queued":
      if (isRetry(job)) {
        return { title: "重试中", detail: "上次尝试失败，正在自动重试", activeStep: 0 };
      }
      return { title: "排队中", detail: "等待转换服务接收任务", activeStep: 0 };
    case "starting":
      return { title: "准备转换", detail: "正在准备音频转换", activeStep: 0 };
    case "downloading":
      return { title: "下载中", detail: "正在从 YouTube 获取音频", activeStep: 1 };
    case "transcoding":
      return { title: "转码中", detail: "正在转换为可播放格式", activeStep: 2 };
    case "uploading":
      return { title: "保存中", detail: "正在保存音频文件", activeStep: 3 };
    case "ready":
      return { title: "已完成", detail: "已加入播放列表", activeStep: 4 };
    default: {
      const _exhaustive: never = phase;
      void _exhaustive;
      return { title: "处理中", detail: "", activeStep: 0 };
    }
  }
}

export function getFeedProgressLabel(
  job: Pick<
    JobResponse,
    "status" | "progressPhase" | "attemptCount" | "lastErrorMessage"
  >,
): FeedProgressLabel {
  const phase = normalizeProgressPhase(job);

  if (phase === "queued" && isRetry(job)) {
    return { label: "重试中" };
  }

  switch (phase) {
    case "queued":
      return { label: "排队中" };
    case "starting":
      return { label: "准备中" };
    case "downloading":
      return { label: "下载中" };
    case "transcoding":
      return { label: "转码中" };
    case "uploading":
      return { label: "保存中" };
    case "ready":
      return { label: "已完成" };
    default: {
      const _exhaustive: never = phase;
      void _exhaustive;
      return { label: "处理中" };
    }
  }
}
