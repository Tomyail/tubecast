// Kickstart Exchange banner 的 API key 解析（纯函数，便于测试）。
//
// 生产构建从 EXPO_PUBLIC_KICKSTART_EXCHANGE_KEY（build-time public config，Expo
// 会在打包时内联）读取 live key；Debug 构建且未配置 key 时回落到 SDK 的
// "preview" 测试 key（仅 Debug + iOS Simulator 生效，不计积分）。
// 生产无 key 时返回 null，banner 隐藏，绝不崩溃。
export const KICKSTART_EXCHANGE_PREVIEW_KEY = "preview";

export type KickstartExchangeKeyEnv = {
  /** 运行平台（Platform.OS）。banner 只支持 iOS。 */
  platform: string;
  /** 是否为开发构建（__DEV__ / NODE_ENV）。 */
  dev: boolean;
  /** 构建期内联的 live key（EXPO_PUBLIC_KICKSTART_EXCHANGE_KEY）。 */
  apiKey?: string | undefined;
};

export function resolveKickstartExchangeApiKey({
  platform,
  dev,
  apiKey,
}: KickstartExchangeKeyEnv): string | null {
  // SDK 只在 iOS 18+ 渲染；其余平台直接不解析 key，也避免把空 key 传给组件。
  if (platform !== "ios") return null;

  const key = apiKey?.trim();
  if (key) return key;
  if (dev) return KICKSTART_EXCHANGE_PREVIEW_KEY;
  return null;
}
