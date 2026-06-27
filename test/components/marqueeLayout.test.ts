import { describe, expect, it } from "vitest";
import { getCurrentTextWidth, getMarqueeLayout, MARQUEE_GAP } from "../../src/components/marqueeLayout";

describe("marquee layout", () => {
  it("does not scroll or duplicate short titles", () => {
    const layout = getMarqueeLayout({ containerWidth: 256, textWidth: 90.7, speed: 30 });

    expect(layout.shouldScroll).toBe(false);
    expect(layout.distance).toBe(0);
  });

  it("ignores a previous track measurement while the current title is not measured yet", () => {
    const textWidth = getCurrentTextWidth(
      { text: "2026年Mac能玩游戏了吗？我们实测了300款游戏！", width: 335 },
      "去了一趟潮汕。",
    );
    const layout = getMarqueeLayout({ containerWidth: 256, textWidth, speed: 30 });

    expect(layout.shouldScroll).toBe(false);
  });

  it("uses the compact gap for overflowing titles", () => {
    const layout = getMarqueeLayout({ containerWidth: 256, textWidth: 335, speed: 30 });

    expect(layout.shouldScroll).toBe(true);
    expect(layout.gap).toBe(24);
    expect(layout.distance).toBe(335 + MARQUEE_GAP);
  });

  it("waits for a real container and text measurement before scrolling", () => {
    expect(getMarqueeLayout({ containerWidth: 0, textWidth: 335, speed: 30 }).shouldScroll).toBe(false);
    expect(getMarqueeLayout({ containerWidth: 256, textWidth: 0, speed: 30 }).shouldScroll).toBe(false);
  });
});
