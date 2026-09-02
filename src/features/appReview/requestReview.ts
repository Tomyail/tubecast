import * as StoreReview from "expo-store-review";
import { Linking } from "react-native";

export const SUPPORT_URL = "https://yt-audio.tomyail.com/support";

/**
 * 共享的「去 App Store 评分」动作，Settings 入口与评分引导共用。
 * 优先走系统原生评分卡片（expo-store-review）；不可用（如 TestFlight 构建）时
 * 回退打开 App Store 评分链接。任何失败都静默，不打断调用方。
 */
export async function requestAppReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }

    const url = StoreReview.storeUrl();
    if (url) await Linking.openURL(url);
  } catch {
    // 评分是 best-effort；失败不得中断播放或设置页。
  }
}
