import { describe, expect, it } from "vitest";
import { kickstartBannerBottom } from "../../src/features/kickstartExchange/layout";
import { MINI_PLAYER_HEIGHT } from "../../src/shared/layoutConstants";

// Kickstart banner 的全局定位：MiniPlayer 显示时叠在其上方，否则贴着 tab bar。
describe("kickstartBannerBottom", () => {
  it("sits directly above the tab bar when MiniPlayer is hidden", () => {
    expect(kickstartBannerBottom({ tabBarHeight: 83, miniPlayerVisible: false })).toBe(83);
  });

  it("stacks on top of the MiniPlayer when visible", () => {
    expect(kickstartBannerBottom({ tabBarHeight: 83, miniPlayerVisible: true })).toBe(
      83 + MINI_PLAYER_HEIGHT,
    );
  });
});
