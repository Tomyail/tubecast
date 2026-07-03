import { describe, it, expect } from "vitest";
import {
  normalizeProgressPhase,
  getHomeProgressInfo,
  getFeedProgressLabel,
  PROGRESS_STEPS,
} from "../../src/features/jobs/progress";
import type { JobResponse } from "../../src/features/jobs/api";

type JobStub = Pick<
  JobResponse,
  "status" | "progressPhase" | "attemptCount" | "lastErrorMessage"
>;

const makeJob = (overrides: Partial<JobStub> = {}): JobStub => ({
  status: "processing",
  progressPhase: null,
  attemptCount: 0,
  lastErrorMessage: null,
  ...overrides,
});

describe("PROGRESS_STEPS", () => {
  it("has 5 steps", () => {
    expect(PROGRESS_STEPS).toHaveLength(5);
  });
});

describe("normalizeProgressPhase", () => {
  it("returns known phases as-is", () => {
    const phases = ["queued", "starting", "downloading", "transcoding", "uploading", "ready"] as const;
    for (const phase of phases) {
      const job = makeJob({ progressPhase: phase });
      expect(normalizeProgressPhase(job)).toBe(phase);
    }
  });

  it("falls back to queued when status=queued and no progressPhase", () => {
    const job = makeJob({ status: "queued", progressPhase: null });
    expect(normalizeProgressPhase(job)).toBe("queued");
  });

  it("falls back to starting when status=processing and no progressPhase", () => {
    const job = makeJob({ status: "processing", progressPhase: null });
    expect(normalizeProgressPhase(job)).toBe("starting");
  });

  it("falls back to ready when status=ready and no progressPhase", () => {
    const job = makeJob({ status: "ready", progressPhase: null });
    expect(normalizeProgressPhase(job)).toBe("ready");
  });

  it("returns starting for unknown phase strings without throwing", () => {
    const job = makeJob({ progressPhase: "future_phase" });
    expect(normalizeProgressPhase(job)).toBe("starting");
  });

  it("empty string progressPhase falls back to status", () => {
    expect(normalizeProgressPhase({ status: "queued", progressPhase: "" })).toBe("queued");
  });
});

describe("getHomeProgressInfo — known phases", () => {
  it("queued → title 排队中, activeStep 0", () => {
    const info = getHomeProgressInfo(makeJob({ status: "queued", progressPhase: "queued" }), "idle");
    expect(info.title).toBe("排队中");
    expect(info.activeStep).toBe(0);
  });

  it("starting → title 准备中, activeStep 0", () => {
    const info = getHomeProgressInfo(makeJob({ progressPhase: "starting" }), "idle");
    expect(info.title).toBe("准备中");
    expect(info.activeStep).toBe(0);
  });

  it("downloading → title 准备中, activeStep 1", () => {
    const info = getHomeProgressInfo(makeJob({ progressPhase: "downloading" }), "idle");
    expect(info.title).toBe("准备中");
    expect(info.activeStep).toBe(1);
  });

  it("transcoding → title 准备中, activeStep 2", () => {
    const info = getHomeProgressInfo(makeJob({ progressPhase: "transcoding" }), "idle");
    expect(info.title).toBe("准备中");
    expect(info.activeStep).toBe(2);
  });

  it("uploading → title 收尾中, activeStep 3", () => {
    const info = getHomeProgressInfo(makeJob({ progressPhase: "uploading" }), "idle");
    expect(info.title).toBe("收尾中");
    expect(info.activeStep).toBe(3);
  });
});

describe("getHomeProgressInfo — retry", () => {
  it("queued with attemptCount>0 and lastErrorMessage → retry copy", () => {
    const job = makeJob({ status: "queued", progressPhase: "queued", attemptCount: 1, lastErrorMessage: "timeout" });
    const info = getHomeProgressInfo(job, "idle");
    expect(info.title).toBe("重试中");
    expect(info.activeStep).toBe(0);
  });

  it("queued with attemptCount=0 → NOT retry copy", () => {
    const job = makeJob({ status: "queued", progressPhase: "queued", attemptCount: 0, lastErrorMessage: "timeout" });
    const info = getHomeProgressInfo(job, "idle");
    expect(info.title).toBe("排队中");
  });

  it("queued with no lastErrorMessage → NOT retry copy", () => {
    const job = makeJob({ status: "queued", progressPhase: "queued", attemptCount: 2, lastErrorMessage: null });
    const info = getHomeProgressInfo(job, "idle");
    expect(info.title).toBe("排队中");
  });
});

describe("getHomeProgressInfo — cacheState overrides", () => {
  it("cacheState=caching overrides any phase → 就绪, activeStep 4", () => {
    const job = makeJob({ progressPhase: "uploading" });
    const info = getHomeProgressInfo(job, "caching");
    expect(info.title).toBe("就绪");
    expect(info.activeStep).toBe(4);
  });

  it("cacheState=cached → 已保存, activeStep 4", () => {
    const job = makeJob({ progressPhase: "uploading" });
    const info = getHomeProgressInfo(job, "cached");
    expect(info.title).toBe("已保存");
    expect(info.activeStep).toBe(4);
  });
});

describe("getFeedProgressLabel", () => {
  it("queued → 排队中", () => {
    expect(getFeedProgressLabel(makeJob({ status: "queued", progressPhase: "queued" })).label).toBe("排队中");
  });

  it("starting → 准备中", () => {
    expect(getFeedProgressLabel(makeJob({ progressPhase: "starting" })).label).toBe("准备中");
  });

  it("downloading → 准备中", () => {
    expect(getFeedProgressLabel(makeJob({ progressPhase: "downloading" })).label).toBe("准备中");
  });

  it("transcoding → 准备中", () => {
    expect(getFeedProgressLabel(makeJob({ progressPhase: "transcoding" })).label).toBe("准备中");
  });

  it("uploading → 收尾中", () => {
    expect(getFeedProgressLabel(makeJob({ progressPhase: "uploading" })).label).toBe("收尾中");
  });

  it("retry queued (attemptCount>0 + lastErrorMessage) → 重试中", () => {
    const job = makeJob({ status: "queued", progressPhase: "queued", attemptCount: 1, lastErrorMessage: "err" });
    expect(getFeedProgressLabel(job).label).toBe("重试中");
  });
});
