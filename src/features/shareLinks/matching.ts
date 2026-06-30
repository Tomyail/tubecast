import type { Track } from "../playlist/storage";

export function youtubeVideoIdFromUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const embedMatch = url.pathname.match(/^\/embed\/([^/]+)\/?$/);
      return embedMatch?.[1] ?? null;
    }
  } catch {}
  return null;
}

export function findTrackForSourceUrl(tracks: Track[], sourceUrl: string): Track | null {
  const targetVideoId = youtubeVideoIdFromUrl(sourceUrl);
  if (targetVideoId) {
    const match = tracks.find((track) => youtubeVideoIdFromUrl(track.sourceUrl) === targetVideoId);
    if (match) return match;
  }
  return tracks.find((track) => track.sourceUrl === sourceUrl) ?? null;
}
