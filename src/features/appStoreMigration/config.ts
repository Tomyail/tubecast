const configuredUrl = process.env.EXPO_PUBLIC_APP_STORE_CAMPAIGN_URL?.trim();

export function parseAppStoreCampaignUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "apps.apple.com" ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Configure this only for builds that should offer the App Store channel.
 * Keeping the URL undefined hides both the startup prompt and Settings row.
 */
export const appStoreCampaignUrl = parseAppStoreCampaignUrl(configuredUrl);
