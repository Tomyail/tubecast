import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Track {
  id: string;
  jobId: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
  localPath: string;
  localFilename?: string;
  sourceUrl: string;
  fileSize: number;
  contentType: string;
  downloadedAt: string;
  playCount: number;
  lastPlayedAt: string | null;
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

async function loadAllTracks(): Promise<Record<string, Track>> {
  const raw = await AsyncStorage.getItem(TRACKS_KEY);
  return raw ? JSON.parse(raw) : {};
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
  if (!playlist) throw new Error(`Playlist ${playlistId} not found`);
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
