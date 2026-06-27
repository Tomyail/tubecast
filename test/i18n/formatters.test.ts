import { describe, expect, it } from "vitest";
import { formatDuration, formatFileSize } from "../../src/i18n/formatters";

describe("localized formatters", () => {
  it("formats duration consistently for media playback", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3900)).toBe("1:05:00");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });

  it("formats file sizes with the active locale", () => {
    expect(formatFileSize(1_572_864, "en")).toBe("1.5 MB");
    expect(formatFileSize(1_572_864, "zh-CN")).toContain("1.5 MB");
  });
});
