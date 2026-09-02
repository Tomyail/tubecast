// 全局浮层布局常量（纯模块，不依赖 react-native，便于 node 测试直接导入）。

// MiniPlayer 卡片的固定高度（card minHeight，见 MiniPlayer.tsx）。
// 浮层（如 Kickstart banner）据此定位，避免运行时测量。
export const MINI_PLAYER_HEIGHT = 64;
