import type { SubscribedChannel, FeedVideo } from "./types";

export type YouTubeApiConfig = {
  apiKey: string;
};

type ParsedInput = { type: "id"; value: string } | { type: "handle"; value: string };

export function parseChannelInput(input: string): ParsedInput | null {
  const trimmed = input.trim();

  // Raw channel ID: UC followed by 22 chars
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Raw handle: @something
  if (/^@[\w.-]+$/.test(trimmed)) {
    return { type: "handle", value: trimmed };
  }

  // URL: /channel/UC...
  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelMatch) {
    return { type: "id", value: channelMatch[1] };
  }

  // URL: /@handle
  const handleMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) {
    return { type: "handle", value: `@${handleMatch[1]}` };
  }

  return null;
}

type ResolvedChannel = {
  id: string;
  title: string;
  thumbnailUrl: string;
  uploadsPlaylistId: string;
};

export async function resolveChannel(
  config: YouTubeApiConfig,
  input: ParsedInput,
): Promise<ResolvedChannel | null> {
  let url: string;
  if (input.type === "id") {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${input.value}&key=${config.apiKey}`;
  } else {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(input.value)}&key=${config.apiKey}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`YouTube API error: ${body?.error?.message || res.status}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || "",
  };
}

export async function fetchRecentVideos(
  config: YouTubeApiConfig,
  playlistId: string,
  maxResults: number,
): Promise<FeedVideo[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${config.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`YouTube API error: ${body?.error?.message || res.status}`);
  }
  const data = await res.json();

  return (data.items || [])
    .filter((item: any) => item.contentDetails?.videoId)
    .map((item: any) => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
      publishedAt: item.snippet.publishedAt,
      watchUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
    }));
}
