import { afterEach, describe, expect, it, vi } from "vitest";

describe("SERVER_URL", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_SERVER_URL;
  });

  it("returns EXPO_PUBLIC_SERVER_URL when set", async () => {
    process.env.EXPO_PUBLIC_SERVER_URL = "http://localhost:8787";
    const { SERVER_URL } = await import("../../src/features/settings/storage");
    expect(SERVER_URL).toBe("http://localhost:8787");
  });

  it("falls back to production URL when env var is not set", async () => {
    const { SERVER_URL } = await import("../../src/features/settings/storage");
    expect(SERVER_URL).toBe("https://yt-audio.tomyail.com");
  });
});
