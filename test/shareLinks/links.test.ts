import { describe, expect, it } from "vitest";
import {
  buildShareLandingUrl,
  buildTrackShareLandingUrl,
  buildTubeCastListenUrl,
  buildYouTubeTimestampUrl,
  parseTubeCastListenUrl,
} from "../../src/features/shareLinks/links";

describe("share links", () => {
  it("builds TubeCast listen deep links", () => {
    const link = buildTubeCastListenUrl("https://youtube.com/watch?v=abc", 12.9);

    expect(link).toBe("tubecast://listen?url=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3Dabc&t=12");
  });

  it("parses TubeCast listen deep links", () => {
    expect(parseTubeCastListenUrl("tubecast://listen?url=https%3A%2F%2Fyoutu.be%2Fabc&t=33")).toEqual({
      sourceUrl: "https://youtu.be/abc",
      startAtSeconds: 33,
    });
  });

  it("builds web share landing links", () => {
    expect(buildShareLandingUrl("https://youtu.be/abc", 7, "https://example.com/")).toBe(
      "https://example.com/share?url=https%3A%2F%2Fyoutu.be%2Fabc&t=7",
    );
  });

  it("adds track metadata to web share landing links", () => {
    expect(buildTrackShareLandingUrl({
      sourceUrl: "https://youtu.be/abc",
      title: "A title",
      channelName: "A channel",
    }, 7, "https://example.com/")).toBe(
      "https://example.com/share?url=https%3A%2F%2Fyoutu.be%2Fabc&t=7&title=A+title&channel=A+channel",
    );
  });

  it("adds a YouTube timestamp fallback", () => {
    expect(buildYouTubeTimestampUrl("https://youtube.com/watch?v=abc", 45)).toBe(
      "https://youtube.com/watch?v=abc&t=45",
    );
  });
});
