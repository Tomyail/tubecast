import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track } from "../playlist/storage";
import { usePlaylist } from "../playlist/context";
import { AudioExpiredError, getDownloadUrl, getJob } from "../jobs/api";
import { ensureTrackCached } from "../jobs/cache";
import { trackFromReadyJob } from "../jobs/track";
import { useTranslation } from "../../i18n";
import {
  initialPlayerState,
  isPlaybackLoadingPhase,
  phaseFromAudioStatus,
  playerReducer,
  type PlaybackSource,
  type PlayerPhase,
} from "./state";

export type { PlaybackSource, PlayerPhase } from "./state";

type PlayerContextValue = {
  activeTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  playbackLoading: boolean;
  currentTime: number;
  duration: number;
  playbackSource: PlaybackSource | null;
  playbackError: string | null;
  playerPhase: PlayerPhase;
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

export function playbackErrorMessage(err: unknown, t?: (key: string) => string): string {
  if (!t) return err instanceof AudioExpiredError ? "音频已过期，请重新转换" : "播放失败，请重试";
  if (err instanceof AudioExpiredError) return t("player.expired");
  return t("player.failed");
}

export { isAudioMetadataReady, isPlaybackLoadingPhase, isPlaybackStartConfirmed } from "./state";

function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { tracks, addTrack, incrementPlayCount } = usePlaylist();
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const player = useAudioPlayer(null, {
    keepAudioSessionActive: true,
    preferredForwardBufferDuration: 15,
    updateInterval: 100,
  });
  const status = useAudioPlayerStatus(player);
  const lastSaveRef = useRef(0);
  const requestIdRef = useRef(0);

  const { activeTrack, queue, playbackSource, playbackError, phase } = state;
  const playbackLoading = isPlaybackLoadingPhase(phase);
  const isPlaying = phase === "playing";
  const isBuffering = phase === "buffering" || (status?.isBuffering ?? false);
  const currentTime = status?.currentTime ?? 0;
  const duration = status?.duration && status.duration > 0 ? status.duration : activeTrack?.durationSeconds ?? 0;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    if (!activeTrack || phase === "idle" || phase === "resolving") return;
    if (status?.error) {
      dispatch({ type: "error", message: t("player.failed") });
      return;
    }
    const nextPhase = phaseFromAudioStatus(state, status, currentTime);
    if (nextPhase) {
      dispatch({ type: "status-phase", phase: nextPhase });
    }
  }, [activeTrack, currentTime, phase, state, status, status?.error, t]);

  // Save progress periodically
  useEffect(() => {
    if (!activeTrack || phase !== "playing") return;
    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_INTERVAL) return;
    lastSaveRef.current = now;
    AsyncStorage.setItem(`${PROGRESS_KEY}${activeTrack.id}`, JSON.stringify({ position: currentTime }));
  }, [activeTrack, currentTime, phase]);

  useEffect(() => {
    if (!activeTrack) return;
    const updated = tracks.find((track) => track.id === activeTrack.id);
    if (updated && updated !== activeTrack) {
      dispatch({ type: "track-updated", track: updated });
    }
  }, [activeTrack, tracks]);

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

  const nextRequestId = useCallback(() => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    const requestId = nextRequestId();
    dispatch({ type: "play-request", requestId, track, queue: newQueue });
    ensureCacheForTrack(track);

    // Resume from saved position
    let position = 0;
    try {
      const raw = await AsyncStorage.getItem(`${PROGRESS_KEY}${track.id}`);
      if (raw) {
        const saved = JSON.parse(raw).position || 0;
        // 保存的进度若已接近曲目结尾（历史脏数据 / didJustFinish 清除前的残留），
        // 视为已播完，从头开始而非 seek 到末尾导致"点击不播放"
        position = saved >= track.durationSeconds - 1 ? 0 : saved;
      }
    } catch {}
    if (requestId !== requestIdRef.current) return;

    try { player.clearLockScreenControls(); } catch {}
    await waitForNextTick();
    if (requestId !== requestIdRef.current) return;

    let source: { uri: string; source: PlaybackSource };
    try {
      source = await resolveTrackSource(track);
    } catch (err) {
      dispatch({ type: "error", requestId, message: playbackErrorMessage(err, t) });
      return;
    }
    if (requestId !== requestIdRef.current) return;

    try {
      player.replace(source.uri);
      dispatch({ type: "source-ready", requestId, source: source.source });
      player.setActiveForLockScreen(true, {
        title: track.title || t("common.untitled"),
        artist: "TubeCast",
        artworkUrl: track.thumbnailUrl || undefined,
      }, {
        showSeekForward: true,
        showSeekBackward: true,
      });
      if (position > 0) await player.seekTo(position);
      if (requestId !== requestIdRef.current) return;
      player.play();
      dispatch({ type: "play-issued", requestId, startPosition: position });
    } catch (err) {
      dispatch({ type: "error", requestId, message: playbackErrorMessage(err, t) });
    }
  }, [ensureCacheForTrack, nextRequestId, player, t]);

  const togglePlayback = useCallback(async () => {
    if (!activeTrack || playbackLoading) return;

    if (phase === "playing" || phase === "buffering") {
      player.pause();
      dispatch({ type: "pause" });
      return;
    }

    if (playbackSource === "remote") {
      const latestTrack = tracks.find((track) => track.id === activeTrack.id) ?? activeTrack;
      const localUri = resolveCachedLocalUri(latestTrack);
      if (localUri) {
        const requestId = nextRequestId();
        dispatch({ type: "play-request", requestId, track: latestTrack, queue });
        try {
          player.replace(localUri);
          dispatch({ type: "source-ready", requestId, source: "local" });
          if (currentTime > 0) await player.seekTo(currentTime);
          if (requestId !== requestIdRef.current) return;
          player.play();
          dispatch({ type: "play-issued", requestId, startPosition: currentTime });
          return;
        } catch (err) {
          dispatch({ type: "error", requestId, message: playbackErrorMessage(err, t) });
        }
      }
    }

    try {
      player.play();
      dispatch({ type: "play-issued", requestId: state.requestId, startPosition: currentTime });
    } catch (err) {
      dispatch({ type: "error", message: playbackErrorMessage(err, t) });
    }
  }, [activeTrack, currentTime, nextRequestId, phase, playbackLoading, playbackSource, player, queue, state.requestId, t, tracks]);

  const seekTo = useCallback((seconds: number) => {
    void player.seekTo(seconds);
  }, [player]);

  const stopPlayback = useCallback(() => {
    const requestId = nextRequestId();
    try { player.pause(); } catch {}
    try { player.clearLockScreenControls(); } catch {}
    dispatch({ type: "stop", requestId });
  }, [nextRequestId, player]);

  const currentIndex = useMemo(() => {
    if (!activeTrack) return -1;
    return queue.findIndex((t) => t.id === activeTrack.id);
  }, [activeTrack, queue]);

  const playNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      void playTrack(queue[currentIndex + 1]);
    }
  }, [currentIndex, queue, playTrack]);

  // Auto-advance on completion
  useEffect(() => {
    if (!activeTrack || !status?.didJustFinish) return;
    incrementPlayCount(activeTrack.id);
    // 播放完毕后清除保存的进度，否则再次点击该曲目会 seek 到接近结尾的位置
    AsyncStorage.removeItem(`${PROGRESS_KEY}${activeTrack.id}`);
    playNext();
  }, [activeTrack, incrementPlayCount, playNext, status?.didJustFinish]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      void player.seekTo(0);
    } else if (currentIndex > 0) {
      void playTrack(queue[currentIndex - 1]);
    }
  }, [currentIndex, queue, playTrack, currentTime, player]);

  const value = useMemo<PlayerContextValue>(() => ({
    activeTrack, queue, isPlaying, isBuffering, playbackLoading, currentTime, duration, playbackSource, playbackError,
    playerPhase: phase,
    playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback,
  }), [activeTrack, queue, isPlaying, isBuffering, playbackLoading, currentTime, duration, playbackSource, playbackError, phase, playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
