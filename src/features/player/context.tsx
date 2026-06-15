import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track } from "../playlist/storage";
import { usePlaylist } from "../playlist/context";
import { AudioExpiredError, getDownloadUrl, getJob } from "../jobs/api";
import { ensureTrackCached } from "../jobs/cache";
import { trackFromReadyJob } from "../jobs/track";

export type PlaybackSource = "local" | "remote";

type PlayerContextValue = {
  activeTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackSource: PlaybackSource | null;
  playbackError: string | null;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  stopPlayback: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PROGRESS_KEY = "player_progress_";
const SAVE_INTERVAL = 5000;

export function resolveCachedLocalUri(track: Track): string | null {
  const filename =
    track.localFilename ||
    (track.localPath ? decodeURIComponent(track.localPath.split("/").pop() || "") : "");
  if (filename) {
    const file = new File(new Directory(Paths.document, "audio"), filename);
    if (file.exists) return file.uri;
  }
  return null;
}

export async function resolveTrackSource(track: Track): Promise<{ uri: string; source: PlaybackSource }> {
  const localUri = resolveCachedLocalUri(track);
  if (localUri) return { uri: localUri, source: "local" };
  return { uri: await getDownloadUrl(track.jobId), source: "remote" };
}

export function playbackErrorMessage(err: unknown): string {
  if (err instanceof AudioExpiredError) return "音频已过期，请重新转换";
  return "播放失败，请重试";
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { tracks, addTrack, incrementPlayCount } = usePlaylist();
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!activeTrack) return;
    const updated = tracks.find((track) => track.id === activeTrack.id);
    if (updated && updated !== activeTrack) {
      setActiveTrack(updated);
    }
  }, [activeTrack, tracks]);

  // Auto-advance on completion
  useEffect(() => {
    if (!activeTrack || !status) return;
    if (status.didJustFinish) {
      incrementPlayCount(activeTrack.id);
      playNext();
    }
  }, [status?.didJustFinish]);

  const ensureCacheForTrack = useCallback((track: Track) => {
    void getJob(track.jobId).then(async (job) => {
      if (job.status !== "ready") return;
      await ensureTrackCached(job, addTrack);
    }).catch(async (err: any) => {
      const message = err.message || "Cache failed";
      const fallbackJob = await getJob(track.jobId).catch(() => null);
      if (fallbackJob?.status === "ready") {
        await addTrack({ ...trackFromReadyJob(fallbackJob, "failed"), cacheError: message });
      }
    });
  }, [addTrack]);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    const requestId = ++playRequestRef.current;
    if (newQueue) setQueue(newQueue);
    setActiveTrack(track);
    setPlaybackSource(null);
    setPlaybackError(null);
    ensureCacheForTrack(track);

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

    let source: { uri: string; source: PlaybackSource };
    try {
      source = await resolveTrackSource(track);
    } catch (err) {
      if (requestId === playRequestRef.current) {
        setPlaybackError(playbackErrorMessage(err));
        setPlaybackSource(null);
      }
      return;
    }
    if (requestId !== playRequestRef.current) return;

    try {
      player.replace(source.uri);
      setPlaybackSource(source.source);
      setPlaybackError(null);
    } catch (err) {
      if (requestId === playRequestRef.current) {
        setPlaybackError(playbackErrorMessage(err));
        setPlaybackSource(null);
      }
      return;
    }
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
  }, [player, ensureCacheForTrack]);

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      player.pause();
      return;
    }

    if (activeTrack && playbackSource === "remote") {
      const latestTrack = tracks.find((track) => track.id === activeTrack.id) ?? activeTrack;
      const localUri = resolveCachedLocalUri(latestTrack);
      if (localUri) {
        const position = currentTime;
        try {
          player.replace(localUri);
          setPlaybackSource("local");
          if (position > 0) player.seekTo(position);
          player.play();
          return;
        } catch {
          setPlaybackError("播放失败，请重试");
        }
      }
    }

    try {
      player.play();
      setPlaybackError(null);
    } catch (err) {
      setPlaybackError(playbackErrorMessage(err));
    }
  }, [activeTrack, currentTime, isPlaying, playbackSource, player, tracks]);

  const seekTo = useCallback((seconds: number) => {
    player.seekTo(seconds);
  }, [player]);

  const stopPlayback = useCallback(() => {
    try { player.pause(); } catch {}
    setActiveTrack(null);
    setQueue([]);
    setPlaybackSource(null);
    setPlaybackError(null);
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
    activeTrack, queue, isPlaying, isBuffering, currentTime, duration, playbackSource, playbackError,
    playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback,
  }), [activeTrack, queue, isPlaying, isBuffering, currentTime, duration, playbackSource, playbackError, playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
