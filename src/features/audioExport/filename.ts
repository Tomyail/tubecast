import type { Track } from "../playlist/storage";

const RESERVED_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const MAX_BASENAME_LENGTH = 120;

function cleanSegment(value: string): string {
  return value
    .replace(RESERVED_FILENAME_CHARS, " ")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSegment(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trim();
}

export function buildAudioExportFilename(track: Pick<Track, "jobId" | "title" | "channelName">): string {
  const title = cleanSegment(track.title);
  const channel = cleanSegment(track.channelName ?? "");

  if (!title) {
    return `TubeCast-${cleanSegment(track.jobId) || "audio"}.m4a`;
  }

  const basename = channel ? `${title}-${channel}` : title;
  return `${truncateSegment(basename, MAX_BASENAME_LENGTH)}.m4a`;
}
