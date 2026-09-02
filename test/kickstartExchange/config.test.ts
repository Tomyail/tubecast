import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  KICKSTART_EXCHANGE_PREVIEW_KEY,
  resolveKickstartExchangeApiKey,
} from "../../src/features/kickstartExchange/config";

describe("kickstart exchange api key resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_KICKSTART_EXCHANGE_KEY;
  });

  it("returns the configured production key on ios", () => {
    expect(
      resolveKickstartExchangeApiKey({ platform: "ios", dev: false, apiKey: "live-key" }),
    ).toBe("live-key");
  });

  it("falls back to the preview key for ios debug builds without a key", () => {
    expect(resolveKickstartExchangeApiKey({ platform: "ios", dev: true })).toBe(
      KICKSTART_EXCHANGE_PREVIEW_KEY,
    );
  });

  it("prefers the configured key over the preview fallback", () => {
    expect(
      resolveKickstartExchangeApiKey({ platform: "ios", dev: true, apiKey: "live-key" }),
    ).toBe("live-key");
  });

  it("treats blank keys as missing", () => {
    expect(resolveKickstartExchangeApiKey({ platform: "ios", dev: false, apiKey: "   " })).toBe(
      null,
    );
  });

  it("hides the banner (null) on ios production builds without a key", () => {
    expect(resolveKickstartExchangeApiKey({ platform: "ios", dev: false })).toBe(null);
  });

  it("never resolves a key on non-ios platforms", () => {
    // Android/Web 不渲染 banner，也不把空/preview key 传给组件（组件空 key 会 throw）。
    expect(resolveKickstartExchangeApiKey({ platform: "android", dev: true })).toBe(null);
    expect(
      resolveKickstartExchangeApiKey({ platform: "android", dev: false, apiKey: "live-key" }),
    ).toBe(null);
    expect(resolveKickstartExchangeApiKey({ platform: "web", dev: true })).toBe(null);
  });

  it("keeps the preview key literal stable", () => {
    // SDK 只认字面量 "preview"（仅 Debug + Simulator 生效）。
    expect(KICKSTART_EXCHANGE_PREVIEW_KEY).toBe("preview");
  });
});
