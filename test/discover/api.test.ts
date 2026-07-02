import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the shared axios client so the discover API is tested in isolation.
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../src/shared/apiClient", () => ({
  apiClient: { get },
}));

import { fetchDiscover } from "../../src/features/discover/api";

describe("discover backend API client", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("requests discover with no-cache headers to avoid stale iOS HTTP cache", async () => {
    get.mockResolvedValue({ data: { recent: [], popular: [] } });

    await fetchDiscover();

    expect(get).toHaveBeenCalledWith(
      "/api/discover",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        }),
      })
    );
  });
});
