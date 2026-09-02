// Kickstart banner 的布局常量（纯模块，不依赖 react-native，便于 node 测试）。
// banner 以 inline 形式渲染在 Settings 页面的 ScrollView 中，不做全局定位计算。

// SDK 原生视图固定高 164pt，没有广告时即为这段保留空白。
export const KICKSTART_BANNER_NATIVE_HEIGHT = 164;
