import type { Track } from "../playlist/storage";

export type SharedListenLink = {
  sourceUrl: string;
  startAtSeconds: number;
};

const APP_SCHEME = "tubecast";
const DEFAULT_WEB_URL = "https://yt-audio.tomyail.com";

export const SHARE_WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ||
  process.env.EXPO_PUBLIC_SHARE_WEB_URL ||
  DEFAULT_WEB_URL
).replace(/\/+$/, "");

function normalizeSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function buildTubeCastListenUrl(sourceUrl: string, startAtSeconds: number): string {
  const params = new URLSearchParams({
    url: sourceUrl,
    t: String(normalizeSeconds(startAtSeconds)),
  });
  return `${APP_SCHEME}://listen?${params.toString()}`;
}

export function buildShareLandingUrl(sourceUrl: string, startAtSeconds: number, webUrl = SHARE_WEB_URL): string {
  const params = new URLSearchParams({
    url: sourceUrl,
    t: String(normalizeSeconds(startAtSeconds)),
  });
  return `${webUrl.replace(/\/+$/, "")}/share?${params.toString()}`;
}

export function buildTrackShareLandingUrl(
  track: Pick<Track, "sourceUrl" | "title" | "channelName">,
  startAtSeconds: number,
  webUrl = SHARE_WEB_URL,
): string {
  const params = new URLSearchParams({
    url: track.sourceUrl,
    t: String(normalizeSeconds(startAtSeconds)),
  });
  const title = track.title?.trim();
  const channel = track.channelName?.trim();
  if (title) params.set("title", title);
  if (channel) params.set("channel", channel);
  return `${webUrl.replace(/\/+$/, "")}/share?${params.toString()}`;
}

export function buildYouTubeTimestampUrl(sourceUrl: string, startAtSeconds: number): string {
  try {
    const url = new URL(sourceUrl);
    url.searchParams.set("t", String(normalizeSeconds(startAtSeconds)));
    return url.toString();
  } catch {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}t=${normalizeSeconds(startAtSeconds)}`;
  }
}

export function parseTubeCastListenUrl(rawUrl: string): SharedListenLink | null {
  try {
    const url = new URL(rawUrl);
    const isListenUrl = url.protocol === `${APP_SCHEME}:` && url.hostname === "listen";
    if (!isListenUrl) return null;
    const sourceUrl = url.searchParams.get("url")?.trim();
    if (!sourceUrl) return null;
    const parsedSeconds = Number(url.searchParams.get("t") ?? 0);
    return {
      sourceUrl,
      startAtSeconds: normalizeSeconds(parsedSeconds),
    };
  } catch {
    return null;
  }
}

export function buildShareMessage(track: Pick<Track, "title">, landingUrl: string, fallbackUrl: string): string {
  const title = track.title?.trim() || "TubeCast";
  return `Listen in TubeCast: ${title}\n${landingUrl}\n\nIf TubeCast is not installed:\n${fallbackUrl}`;
}
