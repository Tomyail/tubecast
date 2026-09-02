import { Platform, StyleSheet, View } from "react-native";
import { KickstartExchangeBanner } from "@tomyail/react-native-kickstart-exchange";
import { resolveKickstartExchangeApiKey } from "./config";
import { screenshotDemoMode } from "../demoMode/config";

// Home 底部的 Kickstart Exchange banner（iOS 18+）。SDK 原生视图固定高 164pt，
// 没有广告时即为这段保留空白。Android/Web、生产缺 key、截图 Demo 模式下都渲染 null。
export default function HomeKickstartBanner() {
  if (screenshotDemoMode) return null;

  const apiKey = resolveKickstartExchangeApiKey({
    platform: Platform.OS,
    // Metro 会在打包时内联替换；等价于 __DEV__。
    dev: process.env.NODE_ENV !== "production",
    apiKey: process.env.EXPO_PUBLIC_KICKSTART_EXCHANGE_KEY,
  });
  if (!apiKey) return null;

  return (
    <View style={styles.container}>
      <KickstartExchangeBanner
        apiKey={apiKey}
        style={styles.banner}
        testID="kickstart-exchange-home-banner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // FAB（bottom 16 + 高 54）悬浮在滚动内容之上；给 banner 尾部留出空隙，
  // 滚动到底时 FAB 不会压住广告区域。
  container: { paddingBottom: 78 },
  banner: { marginHorizontal: 16 },
});
