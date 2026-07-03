import { describe, expect, it } from "vitest";
import { resources } from "../../src/i18n/translations";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

describe("App Review-facing copy", () => {
  it("avoids high-risk download/conversion phrases in visible translations", () => {
    const text = collectStrings(resources).join("\n").toLowerCase();

    expect(text).not.toMatch(/youtube\s+(url|audio|video|channel|downloader|download|convert|conversion)/);
    expect(text).not.toContain("download youtube");
    expect(text).not.toContain("convert youtube");
    expect(text).not.toContain("offline audio");
    expect(text).not.toContain("export audio");
  });
});
