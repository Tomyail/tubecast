import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track } from "../playlist/storage";
import { usePlaylist } from "../playlist/context";

type PlayerContextValue = {
  activeTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlayback: () => void;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PROGRESS_KEY = "player_progress_";
const SAVE_INTERVAL = 5000;

function resolveTrackUri(track: Track): string {
  const filename = track.localFilename || decodeURIComponent(track.localPath.split("/").pop() || "");
  if (filename) {
    const file = new File(new Directory(Paths.document, "audio"), filename);
    if (file.exists) return file.uri;
  }
  return track.localPath;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { tracks, incrementPlayCount } = usePlaylist();
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const player = useAudioPlayer("");
  const status = useAudioPlayerStatus(player);
  const lastSaveRef = useRef(0);
  const playRequestRef = useRef(0);

  const isPlaying = status?.playing ?? false;
  const isBuffering = status?.isBuffering ?? false;
  const currentTime = status?.currentTime ?? 0;
  const duration = status?.duration ?? 0;

  // Save progress periodically
  useEffect(() => {
    if (!activeTrack || !isPlaying) return;
    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_INTERVAL) return;
    lastSaveRef.current = now;
    AsyncStorage.setItem(`${PROGRESS_KEY}${activeTrack.id}`, JSON.stringify({ position: currentTime }));
  }, [activeTrack, currentTime, isPlaying]);

  // Auto-advance on completion
  useEffect(() => {
    if (!activeTrack || !status) return;
    if (status.didJustFinish) {
      incrementPlayCount(activeTrack.id);
      playNext();
    }
  }, [status?.didJustFinish]);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    const requestId = ++playRequestRef.current;
    if (newQueue) setQueue(newQueue);
    setActiveTrack(track);

    // Resume from saved position
    let position = 0;
    try {
      const raw = await AsyncStorage.getItem(`${PROGRESS_KEY}${track.id}`);
      if (raw) position = JSON.parse(raw).position || 0;
    } catch {}

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
    if (requestId !== playRequestRef.current) return;

    try { player.pause(); } catch {}
    try { player.clearLockScreenControls(); } catch {}

    player.replace(resolveTrackUri(track));
    if (requestId !== playRequestRef.current) return;

    player.setActiveForLockScreen(true, {
      title: track.title || "Untitled",
      artist: "YT Audio",
      artworkUrl: track.thumbnailUrl || undefined,
    }, {
      showSeekForward: true,
      showSeekBackward: true,
    });
    if (position > 0) player.seekTo(position);
    if (requestId !== playRequestRef.current) return;
    player.play();
  }, [player]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) player.pause();
    else player.play();
  }, [player, isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    player.seekTo(seconds);
  }, [player]);

  const currentIndex = useMemo(() => {
    if (!activeTrack) return -1;
    return queue.findIndex((t) => t.id === activeTrack.id);
  }, [activeTrack, queue]);

  const playNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1]);
    }
  }, [currentIndex, queue, playTrack]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      player.seekTo(0);
    } else if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1]);
    }
  }, [currentIndex, queue, playTrack, currentTime, player]);

  const value = useMemo<PlayerContextValue>(() => ({
    activeTrack, queue, isPlaying, isBuffering, currentTime, duration,
    playTrack, togglePlayback, seekTo, playNext, playPrevious,
  }), [activeTrack, queue, isPlaying, isBuffering, currentTime, duration, playTrack, togglePlayback, seekTo, playNext, playPrevious]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
