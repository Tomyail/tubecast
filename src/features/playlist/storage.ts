import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export type TrackCacheStatus = "none" | "caching" | "cached" | "failed";

export interface Track {
  id: string;
  jobId: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
  localPath: string | null;
  localFilename?: string | null;
  sourceUrl: string;
  fileSize: number | null;
  contentType: string;
  downloadedAt: string | null;
  cacheStatus: TrackCacheStatus;
  cacheError?: string | null;
  playCount: number;
  lastPlayedAt: string | null;
  channelId: string | null;
  channelName: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

const TRACKS_KEY = "playlist_tracks";
const PLAYLISTS_KEY = "playlists";

// --- Tracks ---

function localFileExists(track: Pick<Track, "localPath" | "localFilename">): boolean {
  const filename =
    track.localFilename ||
    (track.localPath ? decodeURIComponent(track.localPath.split("/").pop() || "") : "");
  if (!filename) return false;
  try {
    return new File(new Directory(Paths.document, "audio"), filename).exists;
  } catch {
    return false;
  }
}

function normalizeTrack(rawTrack: Partial<Track> & { id: string; jobId: string }): Track {
  const hadCacheStatus = rawTrack.cacheStatus != null;
  const cacheStatus =
    rawTrack.cacheStatus ??
    (rawTrack.localPath ? "cached" : "none");

  const track: Track = {
    id: rawTrack.id,
    jobId: rawTrack.jobId,
    title: rawTrack.title || "Unknown",
    durationSeconds: rawTrack.durationSeconds || 0,
    thumbnailUrl: rawTrack.thumbnailUrl || "",
    localPath: rawTrack.localPath ?? null,
    localFilename: rawTrack.localFilename ?? null,
    sourceUrl: rawTrack.sourceUrl || "",
    fileSize: rawTrack.fileSize ?? null,
    contentType: rawTrack.contentType || "audio/mp4",
    downloadedAt: rawTrack.downloadedAt ?? null,
    cacheStatus: cacheStatus === "caching" ? "none" : cacheStatus,
    cacheError: rawTrack.cacheError ?? null,
    playCount: rawTrack.playCount || 0,
    lastPlayedAt: rawTrack.lastPlayedAt ?? null,
    channelId: rawTrack.channelId ?? null,
    channelName: rawTrack.channelName ?? null,
  };

  if (track.cacheStatus === "cached") {
    const shouldVerify = hadCacheStatus || track.localFilename != null;
    if (!track.localPath || (shouldVerify && !localFileExists(track))) {
      return {
        ...track,
        localPath: null,
        localFilename: null,
        downloadedAt: null,
        cacheStatus: "none",
        cacheError: null,
      };
    }
  }

  return track;
}

async function loadAllTracks(): Promise<Record<string, Track>> {
  const raw = await AsyncStorage.getItem(TRACKS_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw) as Record<string, Partial<Track> & { id: string; jobId: string }>;
  return Object.fromEntries(
    Object.entries(parsed).map(([id, track]) => [id, normalizeTrack(track)])
  );
}

async function saveAllTracks(tracks: Record<string, Track>): Promise<void> {
  await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
}

export async function getTrack(id: string): Promise<Track | null> {
  const tracks = await loadAllTracks();
  return tracks[id] || null;
}

export async function getAllTracks(): Promise<Track[]> {
  const tracks = await loadAllTracks();
  return Object.values(tracks);
}

export async function saveTrack(track: Track): Promise<void> {
  const tracks = await loadAllTracks();
  tracks[track.id] = track;
  await saveAllTracks(tracks);
}

export async function removeTrack(id: string): Promise<void> {
  const tracks = await loadAllTracks();
  delete tracks[id];
  await saveAllTracks(tracks);
}

export async function removeTracks(ids: string[]): Promise<void> {
  const tracks = await loadAllTracks();
  for (const id of ids) {
    delete tracks[id];
  }
  await saveAllTracks(tracks);
}

export async function updateTrackPlayCount(id: string): Promise<void> {
  const tracks = await loadAllTracks();
  if (tracks[id]) {
    tracks[id].playCount++;
    tracks[id].lastPlayedAt = new Date().toISOString();
    await saveAllTracks(tracks);
  }
}

// --- Playlists ---

async function loadAllPlaylists(): Promise<Record<string, Playlist>> {
  const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveAllPlaylists(playlists: Record<string, Playlist>): Promise<void> {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export async function getDefaultPlaylist(): Promise<Playlist> {
  const playlists = await loadAllPlaylists();
  const existing = Object.values(playlists).find((p) => p.name === "My Music");
  if (existing) return existing;

  const created: Playlist = {
    id: "default",
    name: "My Music",
    trackIds: [],
    createdAt: new Date().toISOString(),
  };
  playlists[created.id] = created;
  await saveAllPlaylists(playlists);
  return created;
}

export async function addTrackToPlaylist(trackId: string, playlistId = "default"): Promise<Playlist> {
  const playlists = await loadAllPlaylists();
  const playlist = playlists[playlistId];
  if (!playlist) throw new Error(`Playlist ${playlistId} not found`);
  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    await saveAllPlaylists(playlists);
  }
  return playlist;
}

export async function removeTrackFromPlaylist(trackId: string, playlistId = "default"): Promise<void> {
  const playlists = await loadAllPlaylists();
  const playlist = playlists[playlistId];
  if (!playlist) return;
  playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  await saveAllPlaylists(playlists);
}

export async function removeTracksFromPlaylist(
  trackIds: string[],
  playlistId = "default"
): Promise<Playlist> {
  const playlists = await loadAllPlaylists();
  const playlist = playlists[playlistId];
  if (!playlist) {
    return { id: playlistId, name: "", trackIds: [], createdAt: "" };
  }
  const idSet = new Set(trackIds);
  playlist.trackIds = playlist.trackIds.filter((id) => !idSet.has(id));
  await saveAllPlaylists(playlists);
  return playlist;
}

export async function savePlaylistOrder(trackIds: string[], playlistId = "default"): Promise<void> {
  const playlists = await loadAllPlaylists();
  const playlist = playlists[playlistId];
  if (!playlist) return;
  playlist.trackIds = trackIds;
  await saveAllPlaylists(playlists);
}
