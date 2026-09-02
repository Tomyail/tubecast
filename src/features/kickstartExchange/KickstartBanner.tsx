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
export default function KickstartBanner({ colors }: { colors: { border: string } }) {
  const apiKey = useKickstartExchangeApiKey();
  if (!apiKey) return null;

  return (
    <View style={[styles.banner, { borderColor: colors.border }]}>
      <KickstartExchangeBanner
        apiKey={apiKey}
        style={styles.nativeBanner}
        testID="kickstart-exchange-banner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 与 Settings 的 section group 一致的圆角/描边；高度为 SDK 原生固定 164pt。
  banner: {
    height: KICKSTART_BANNER_NATIVE_HEIGHT,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  nativeBanner: {
    flex: 1,
  },
});
