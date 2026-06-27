import { describe, expect, it } from "vitest";
import {
  getDisplayedProgressTime,
  getProgressXFromPageX,
  getSeekTimeFromDrag,
} from "../../src/screens/playerProgress";

describe("player progress drag", () => {
  it("uses the initial touch position plus gesture delta for stable scrubbing", () => {
    expect(getSeekTimeFromDrag(120, 80, 400, 200)).toBe(100);
  });

  it("derives the start position from screen coordinates instead of child-local touch coordinates", () => {
    const progressLeft = 24;
    const pageXOnThumbAtMiddle = 224;
    const childLocalLocationX = 9;

    expect(getProgressXFromPageX(pageXOnThumbAtMiddle, progressLeft)).toBe(200);
    expect(getProgressXFromPageX(pageXOnThumbAtMiddle, progressLeft)).not.toBe(childLocalLocationX);
    expect(getSeekTimeFromDrag(getProgressXFromPageX(pageXOnThumbAtMiddle, progressLeft), 0, 400, 200)).toBe(100);
  });

  it("clamps dragging outside the rail", () => {
    expect(getSeekTimeFromDrag(20, -80, 400, 200)).toBe(0);
    expect(getSeekTimeFromDrag(380, 80, 400, 200)).toBe(200);
  });

  it("does not produce a seek target without duration or width", () => {
    expect(getSeekTimeFromDrag(100, 50, 400, 0)).toBe(0);
    expect(getSeekTimeFromDrag(100, 50, 0, 200)).toBe(0);
  });

  it("keeps the committed seek target visible until native progress catches up", () => {
    expect(getDisplayedProgressTime(38, null, 480)).toBe(480);
    expect(getDisplayedProgressTime(38, 500, 480)).toBe(500);
    expect(getDisplayedProgressTime(481, null, null)).toBe(481);
  });
});
