import { Platform, StyleSheet, View } from "react-native";
import { KickstartExchangeBanner } from "@tomyail/react-native-kickstart-exchange";
import { resolveKickstartExchangeApiKey } from "./config";
import { screenshotDemoMode } from "../demoMode/config";
import { KICKSTART_BANNER_NATIVE_HEIGHT } from "./layout";

// 解析当前可用的 key：iOS 18+ 平台、非截图 Demo 模式、生产需 live key（Debug 回落
// preview）。返回 null 表示 banner 应隐藏。Metro 会内联替换 process.env。
export function useKickstartExchangeApiKey(): string | null {
  if (screenshotDemoMode) return null;
  return resolveKickstartExchangeApiKey({
    platform: Platform.OS,
    dev: process.env.NODE_ENV !== "production",
    apiKey: process.env.EXPO_PUBLIC_KICKSTART_EXCHANGE_KEY,
  });
}

// Kickstart Exchange banner（iOS 18+）：以 inline 形式渲染在 Settings 页面的
// ScrollView 中，放在「存储空间」和「关于」两个 section 之间，随页面滚动，
// 不遮挡播放器（Screen 已为 MiniPlayer 预留底部空间）。
export default function KickstartBanner() {
  const apiKey = useKickstartExchangeApiKey();
  if (!apiKey) return null;

  return (
    <View style={styles.banner}>
      <KickstartExchangeBanner
        apiKey={apiKey}
        style={styles.nativeBanner}
        testID="kickstart-exchange-banner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 只负责给原生 SDK 卡片提供紧凑的布局空间；边框由 SDK 自己绘制，避免双层边框。
  banner: {
    height: KICKSTART_BANNER_NATIVE_HEIGHT,
    overflow: "hidden",
  },
  nativeBanner: {
    flex: 1,
  },
});
