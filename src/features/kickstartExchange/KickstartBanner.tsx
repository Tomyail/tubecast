import { Platform, StyleSheet, View } from "react-native";
import { KickstartExchangeBanner } from "@tomyail/react-native-kickstart-exchange";
import { resolveKickstartExchangeApiKey } from "./config";
import { screenshotDemoMode } from "../demoMode/config";
import { KICKSTART_BANNER_NATIVE_HEIGHT, KICKSTART_BANNER_MARGIN } from "./layout";

export {
  KICKSTART_BANNER_NATIVE_HEIGHT,
  KICKSTART_BANNER_MARGIN,
  KICKSTART_BANNER_TOTAL_HEIGHT,
  kickstartBannerBottom,
} from "./layout";

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

// 全局 Kickstart Exchange banner（iOS 18+）：由 RootNavigator 挂在 Tabs 层，
// 固定悬浮在 MiniPlayer（若有）或 tab bar 上方，不随页面滚动。
export default function KickstartBanner({ bottom }: { bottom: number }) {
  const apiKey = useKickstartExchangeApiKey();
  if (!apiKey) return null;

  return (
    <View pointerEvents="box-none" style={[styles.shell, { bottom }]}>
      <View style={styles.banner}>
        <KickstartExchangeBanner
          apiKey={apiKey}
          style={styles.nativeBanner}
          testID="kickstart-exchange-banner"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  banner: {
    height: KICKSTART_BANNER_NATIVE_HEIGHT,
    marginHorizontal: 16,
    marginBottom: KICKSTART_BANNER_MARGIN,
  },
  nativeBanner: {
    flex: 1,
  },
});
