import * as StoreReview from "expo-store-review";
import { Linking } from "react-native";

export const SUPPORT_URL = "https://yt-audio.tomyail.com/support";

/**
 * 直接打开 App Store 评分页，供用户主动点击的设置入口使用。
 * 原生 requestReview 可能被 Apple 静默抑制，因此主动操作不应只依赖评分卡片。
 */
export async function openAppStoreReview(): Promise<void> {
  try {
    const url = StoreReview.storeUrl();
    if (url) await Linking.openURL(url);
  } catch {
    // 评分是 best-effort；失败不得中断播放或设置页。
  }
}

/**
 * 评分引导优先走系统原生评分卡片；不可用或调用报错时回退到 App Store。
 * 注意：原生 API 返回成功不代表 Apple 一定显示评分卡片。
 */
export async function requestAppReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // 原生评分不可用时继续尝试打开商店页面。
  }

  await openAppStoreReview();
}
