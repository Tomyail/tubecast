import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Track, Playlist } from "./storage";
import {
  getAllTracks, saveTrack, removeTrack, updateTrackPlayCount,
  getDefaultPlaylist, addTrackToPlaylist, removeTrackFromPlaylist,
  savePlaylistOrder, removeTracks, removeTracksFromPlaylist,
} from "./storage";

type PlaylistContextValue = {
  tracks: Track[];
  playlist: Playlist | null;
  addTrack: (track: Track) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  deleteTracks: (trackIds: string[]) => Promise<void>;
  incrementPlayCount: (trackId: string) => Promise<void>;
  reorderTracks: (newTracks: Track[]) => Promise<void>;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [trackMap, p] = await Promise.all([getAllTracks(), getDefaultPlaylist()]);
      if (mounted) {
        // Order tracks by playlist.trackIds so stored order is respected
        const ordered = p.trackIds
          .map((id) => trackMap.find((t) => t.id === id))
          .filter((t): t is Track => t !== undefined);
        setTracks(ordered);
        setPlaylist(p);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const addTrack = useCallback(async (track: Track) => {
    await saveTrack(track);
    const updated = await addTrackToPlaylist(track.id);
    setTracks((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.map((t) => (t.id === track.id ? track : t))
        : [...prev, track]
    );
    setPlaylist(updated);
  }, []);

  const deleteTrack = useCallback(async (trackId: string) => {
    await removeTrack(trackId);
    await removeTrackFromPlaylist(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setPlaylist((prev) => prev ? { ...prev, trackIds: prev.trackIds.filter((id) => id !== trackId) } : null);
  }, []);

  const deleteTracks = useCallback(async (trackIds: string[]) => {
    await removeTracks(trackIds);
    await removeTracksFromPlaylist(trackIds);
    const idSet = new Set(trackIds);
    setTracks((prev) => prev.filter((t) => !idSet.has(t.id)));
    setPlaylist((prev) =>
      prev ? { ...prev, trackIds: prev.trackIds.filter((id) => !idSet.has(id)) } : null
    );
  }, []);

  const incrementPlayCount = useCallback(async (trackId: string) => {
    await updateTrackPlayCount(trackId);
    setTracks((prev) => prev.map((t) =>
      t.id === trackId ? { ...t, playCount: t.playCount + 1, lastPlayedAt: new Date().toISOString() } : t
    ));
  }, []);

  const reorderTracks = useCallback(async (newTracks: Track[]) => {
    const newIds = newTracks.map((t) => t.id);
    await savePlaylistOrder(newIds);
    setTracks(newTracks);
    setPlaylist((prev) => prev ? { ...prev, trackIds: newIds } : null);
  }, []);

  const value = useMemo<PlaylistContextValue>(() => ({
    tracks, playlist, addTrack, deleteTrack, deleteTracks, incrementPlayCount, reorderTracks,
  }), [tracks, playlist, addTrack, deleteTrack, deleteTracks, incrementPlayCount, reorderTracks]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}
