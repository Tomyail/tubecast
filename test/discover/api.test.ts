import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchDiscover } from "../../src/features/discover/api";

describe("discover backend API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests discover with no-cache headers to avoid stale iOS HTTP cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recent: [], popular: [] }),
      }),
    );

    await fetchDiscover();

    expect(fetch).toHaveBeenCalledWith(
      "https://yt-audio.tomyail.com/api/discover",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        }),
      }),
    );
  });
});
