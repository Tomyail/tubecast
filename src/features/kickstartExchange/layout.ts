// Kickstart banner 的布局常量（纯模块，不依赖 react-native，便于 node 测试）。
// banner 以 inline 形式渲染在 Settings 页面的 ScrollView 中，不做全局定位计算。

// 外层容器高度：SDK 卡片实际渲染高度约 96pt 左右，取 100pt 留出上下内边距，
// 避免无广告时在 Settings 中保留大段空白（原生视图会在此高度内居中内容）。
export const KICKSTART_BANNER_NATIVE_HEIGHT = 100;
