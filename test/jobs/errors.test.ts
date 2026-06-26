import { describe, expect, it } from "vitest";
import { getConversionFailureMessage, isLiveUnsupportedError, isLiveUnsupportedJob } from "../../src/features/jobs/errors";

describe("job error helpers", () => {
  it("recognizes common live stream failure messages", () => {
    expect(isLiveUnsupportedError("This video is a live stream")).toBe(true);
    expect(isLiveUnsupportedError("Premiere will begin shortly")).toBe(true);
    expect(isLiveUnsupportedError("直播视频暂不可用")).toBe(true);
  });

  it("does not treat unrelated failures as live unsupported", () => {
    expect(isLiveUnsupportedError("network timeout")).toBe(false);
    expect(isLiveUnsupportedError(null)).toBe(false);
  });

  it("checks both current and last job error messages", () => {
    expect(isLiveUnsupportedJob({ errorMessage: null, lastErrorMessage: "upcoming live event" })).toBe(true);
  });

  it("returns localized unsupported copy for live failures", () => {
    const t = (key: string) => key === "errors.liveUnsupported" ? "暂不支持转换直播视频。" : key;
    expect(getConversionFailureMessage({ errorMessage: "live stream", lastErrorMessage: null }, t as any)).toBe("暂不支持转换直播视频。");
  });
});
