import { describe, expect, it } from "vitest";
import { buildAudioExportFilename } from "../../src/features/audioExport/filename";

describe("buildAudioExportFilename", () => {
  it("uses title-channel.m4a", () => {
    expect(buildAudioExportFilename({
      jobId: "job-1",
      title: "A Track",
      channelName: "A Channel",
    })).toBe("A Track-A Channel.m4a");
  });

  it("cleans unsafe filename characters and whitespace", () => {
    expect(buildAudioExportFilename({
      jobId: "job-1",
      title: " A/B: C?  ",
      channelName: " Channel*Name ",
    })).toBe("A B C-Channel Name.m4a");
  });

  it("falls back to the job id when the title is empty", () => {
    expect(buildAudioExportFilename({
      jobId: "job-1",
      title: "",
      channelName: "A Channel",
    })).toBe("TubeCast-job-1.m4a");
  });

  it("keeps the exported basename reasonably short", () => {
    const filename = buildAudioExportFilename({
      jobId: "job-1",
      title: "a".repeat(200),
      channelName: "A Channel",
    });

    expect(filename.endsWith(".m4a")).toBe(true);
    expect(filename.length).toBeLessThanOrEqual(124);
  });
});
