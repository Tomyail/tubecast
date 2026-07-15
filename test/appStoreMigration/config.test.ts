import { describe, expect, it } from "vitest";
import { parseAppStoreCampaignUrl } from "../../src/features/appStoreMigration/config";

describe("App Store migration configuration", () => {
  it("accepts an HTTPS apps.apple.com campaign link", () => {
    const link = "https://apps.apple.com/app/apple-store/id123?pt=456&ct=testflight-migration&mt=8";
    expect(parseAppStoreCampaignUrl(link)).toBe(link);
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "http://apps.apple.com/app/id123",
    "https://example.com/app/id123",
  ])("hides the migration UI for an invalid link: %s", (link) => {
    expect(parseAppStoreCampaignUrl(link)).toBeUndefined();
  });
});
