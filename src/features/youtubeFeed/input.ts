const YOUTUBE_VIDEO_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/;
const YOUTUBE_HANDLE_PATTERN = /^@[\w.-]{1,100}$/;

export function isSupportedYouTubeVideoUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || !YOUTUBE_VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return false;
  }

  if (url.hostname.toLowerCase() === "youtu.be") {
    return YOUTUBE_VIDEO_ID_PATTERN.test(url.pathname.slice(1).split("/")[0] ?? "");
  }

  if (url.pathname === "/watch") {
    return YOUTUBE_VIDEO_ID_PATTERN.test(url.searchParams.get("v") ?? "");
  }

  const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})\/?$/);
  return Boolean(embedMatch);
}

export function isSupportedYouTubeChannelInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 200) {
    return false;
  }

  if (YOUTUBE_CHANNEL_ID_PATTERN.test(trimmed) || YOUTUBE_HANDLE_PATTERN.test(trimmed)) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "youtube.com" && host !== "www.youtube.com" && host !== "m.youtube.com") {
    return false;
  }

  return /^\/channel\/UC[\w-]{22}\/?$/.test(url.pathname) || /^\/@[\w.-]{1,100}\/?$/.test(url.pathname);
}
