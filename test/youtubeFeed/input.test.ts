import { describe, expect, it } from "vitest";
import { isSupportedYouTubeChannelInput, isSupportedYouTubeVideoUrl } from "../../src/features/youtubeFeed/input";

describe("isSupportedYouTubeVideoUrl", () => {
  it("accepts YouTube video URLs supported by the conversion API", () => {
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/watch?v=abc123DEF_4")).toBe(true);
    expect(isSupportedYouTubeVideoUrl("https://youtu.be/abc123DEF_4")).toBe(true);
    expect(isSupportedYouTubeVideoUrl("https://m.youtube.com/watch?v=abc123DEF_4")).toBe(true);
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/embed/abc123DEF_4")).toBe(true);
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/shorts/abc123DEF_4")).toBe(true);
  });

  it("rejects channel inputs and unsupported URLs", () => {
    expect(isSupportedYouTubeVideoUrl("@some-channel")).toBe(false);
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/@some-channel")).toBe(false);
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
    expect(isSupportedYouTubeVideoUrl("https://example.com/watch?v=abc123DEF_4")).toBe(false);
    expect(isSupportedYouTubeVideoUrl("http://www.youtube.com/watch?v=abc123DEF_4")).toBe(false);
    expect(isSupportedYouTubeVideoUrl("https://www.youtube.com/watch?v=short")).toBe(false);
  });
});

describe("isSupportedYouTubeChannelInput", () => {
  it("accepts channel inputs supported by the feed API", () => {
    expect(isSupportedYouTubeChannelInput("@some-channel")).toBe(true);
    expect(isSupportedYouTubeChannelInput("https://www.youtube.com/@some-channel")).toBe(true);
    expect(isSupportedYouTubeChannelInput("UCxxxxxxxxxxxxxxxxxxxxxx")).toBe(true);
    expect(isSupportedYouTubeChannelInput("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx")).toBe(true);
    expect(isSupportedYouTubeChannelInput("https://m.youtube.com/@some-channel")).toBe(true);
  });

  it("rejects video inputs and unsupported channel URL shapes", () => {
    expect(isSupportedYouTubeChannelInput("https://www.youtube.com/watch?v=abc123DEF_4")).toBe(false);
    expect(isSupportedYouTubeChannelInput("https://youtu.be/abc123DEF_4")).toBe(false);
    expect(isSupportedYouTubeChannelInput("https://www.youtube.com/c/some-channel")).toBe(false);
    expect(isSupportedYouTubeChannelInput("https://www.youtube.com/user/some-channel")).toBe(false);
    expect(isSupportedYouTubeChannelInput("https://example.com/@some-channel")).toBe(false);
  });
});
