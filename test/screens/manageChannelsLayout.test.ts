import { describe, expect, it } from "vitest";
import { getManageChannelsListBottomPadding, getManageChannelsListContentHeight } from "../../src/screens/manageChannelsLayout";

describe("manage channels list layout", () => {
  it("keeps the final channel above the modal bottom safe area", () => {
    expect(getManageChannelsListBottomPadding(34)).toBe(58);
  });

  it("keeps the normal list padding when there is no bottom inset", () => {
    expect(getManageChannelsListBottomPadding(0)).toBe(28);
  });

  it("keeps all eleven recorded channels in the native scrollable content size", () => {
    const recordedViewportHeight = 758;

    expect(getManageChannelsListContentHeight(11, 34)).toBe(866);
    expect(getManageChannelsListContentHeight(11, 34)).toBeGreaterThan(recordedViewportHeight);
  });
});
