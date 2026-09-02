// Kickstart banner 的布局常量与定位计算（纯模块，不依赖 react-native，便于 node 测试）。
import { MINI_PLAYER_HEIGHT } from "../../shared/layoutConstants";

// SDK 原生视图固定高 164pt，没有广告时即为这段保留空白。
export const KICKSTART_BANNER_NATIVE_HEIGHT = 164;
// banner 上下留白（与 tab bar / MiniPlayer 的间距）。
export const KICKSTART_BANNER_MARGIN = 8;
// banner 在屏幕上的总占用高度，FAB 等浮层据此避让。
export const KICKSTART_BANNER_TOTAL_HEIGHT =
  KICKSTART_BANNER_NATIVE_HEIGHT + KICKSTART_BANNER_MARGIN * 2;

// banner 的固定 bottom：MiniPlayer 显示时叠在其上方，否则贴着 tab bar。
export function kickstartBannerBottom({
  tabBarHeight,
  miniPlayerVisible,
}: {
  tabBarHeight: number;
  miniPlayerVisible: boolean;
}): number {
  return tabBarHeight + (miniPlayerVisible ? MINI_PLAYER_HEIGHT : 0);
}
