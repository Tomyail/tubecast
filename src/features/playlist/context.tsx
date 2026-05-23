import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Track, Playlist } from "./storage";
import {
  getAllTracks, saveTrack, removeTrack, updateTrackPlayCount,
  getDefaultPlaylist, addTrackToPlaylist, removeTrackFromPlaylist,
} from "./storage";

type PlaylistContextValue = {
  tracks: Track[];
  playlist: Playlist | null;
  addTrack: (track: Track) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  incrementPlayCount: (trackId: string) => Promise<void>;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, p] = await Promise.all([getAllTracks(), getDefaultPlaylist()]);
      if (mounted) {
        setTracks(t);
        setPlaylist(p);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const addTrack = useCallback(async (track: Track) => {
    await saveTrack(track);
    const updated = await addTrackToPlaylist(track.id);
    setTracks((prev) => [...prev, track]);
    setPlaylist(updated);
  }, []);

  const deleteTrack = useCallback(async (trackId: string) => {
    await removeTrack(trackId);
    await removeTrackFromPlaylist(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setPlaylist((prev) => prev ? { ...prev, trackIds: prev.trackIds.filter((id) => id !== trackId) } : null);
  }, []);

  const incrementPlayCount = useCallback(async (trackId: string) => {
    await updateTrackPlayCount(trackId);
    setTracks((prev) => prev.map((t) =>
      t.id === trackId ? { ...t, playCount: t.playCount + 1, lastPlayedAt: new Date().toISOString() } : t
    ));
  }, []);

  const value = useMemo<PlaylistContextValue>(() => ({
    tracks, playlist, addTrack, deleteTrack, incrementPlayCount,
  }), [tracks, playlist, addTrack, deleteTrack, incrementPlayCount]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}
