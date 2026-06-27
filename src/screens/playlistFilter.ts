import type { Track } from "../features/playlist/storage";

export type PlaylistFilter = "all" | "unplayed";

export function isUnplayedTrack(track: Pick<Track, "playCount">): boolean {
  return track.playCount === 0;
}

export function getVisiblePlaylistTracks<T extends Pick<Track, "playCount">>(
  tracks: T[],
  filter: PlaylistFilter
): T[] {
  if (filter === "unplayed") return tracks.filter(isUnplayedTrack);
  return tracks;
}

export function getPlaylistFilterCounts(tracks: Pick<Track, "playCount">[]): {
  all: number;
  unplayed: number;
} {
  return {
    all: tracks.length,
    unplayed: tracks.filter(isUnplayedTrack).length,
  };
}
