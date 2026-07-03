import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mobile remote config", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_MOBILE_CONFIG_URL;
    delete process.env.EXPO_PUBLIC_SERVER_URL;
  });

  it("defaults to the API mobile config endpoint", async () => {
    const { MOBILE_CONFIG_URL, getMobileConfigUrls } = await import("../../src/features/remoteConfig/context");

    expect(MOBILE_CONFIG_URL).toBe("https://yt-audio.tomyail.com/api/mobile-config");
    expect(getMobileConfigUrls()).toEqual(["https://yt-audio.tomyail.com/api/mobile-config"]);
  });

  it("keeps the API endpoint as fallback when an override is configured", async () => {
    process.env.EXPO_PUBLIC_MOBILE_CONFIG_URL = "https://example.com/mobile-config.json";
    const { getMobileConfigUrls } = await import("../../src/features/remoteConfig/context");

    expect(getMobileConfigUrls()).toEqual([
      "https://example.com/mobile-config.json",
      "https://yt-audio.tomyail.com/api/mobile-config",
    ]);
  });

  it("uses the configured API server as fallback", async () => {
    process.env.EXPO_PUBLIC_SERVER_URL = "https://api.example.com/";
    const { getMobileConfigUrls } = await import("../../src/features/remoteConfig/context");

    expect(getMobileConfigUrls()).toEqual(["https://api.example.com/api/mobile-config"]);
  });

  it("parses supported feature flags", async () => {
    const { parseRemoteConfig } = await import("../../src/features/remoteConfig/context");

    expect(
      parseRemoteConfig({
        features: {
          linkProcessingEnabled: false,
          audioExportEnabled: false,
        },
      }),
    ).toEqual({
      linkProcessingEnabled: false,
      audioExportEnabled: false,
    });
  });

  it("rejects non-config payloads", async () => {
    const { parseRemoteConfig } = await import("../../src/features/remoteConfig/context");

    expect(parseRemoteConfig("<html>not json</html>")).toBeNull();
    expect(parseRemoteConfig({})).toBeNull();
  });
});
