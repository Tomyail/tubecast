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
  duration: number;
  playbackSource: PlaybackSource | null;
  playbackError: string | null;
  playerPhase: PlayerPhase;
  playTrack: (track: Track, queue?: Track[], options?: { startAtSeconds?: number }) => Promise<void>;
  togglePlayback: () => Promise<void>;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  stopPlayback: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
// 高频进度值(约 100ms 更新)独立成 context,避免只取 action 的消费者被进度重渲染波及。
const PlaybackProgressContext = createContext<number>(0);
const PROGRESS_KEY = "player_progress_";
const SAVE_INTERVAL = 5000;
const PLAYBACK_STATUS_UPDATE_INTERVAL_MS = 500;
// 乐观 resume 后容忍 status 短暂 !playing 的宽限期(player.play() 生效前的陈旧 status
// 否则会把 playing→paused→playing 抖动)。
const RESUME_GRACE_MS = 800;

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

export function getLockScreenArtist(track: Pick<Track, "channelName">): string {
  const channelName = track.channelName?.trim();
  return channelName || "TubeCast";
}

type LockScreenPlayer = {
  setActiveForLockScreen(
    active: boolean,
    metadata?: { title?: string; artist?: string; artworkUrl?: string },
    options?: { showSeekForward?: boolean; showSeekBackward?: boolean }
  ): void;
  updateLockScreenMetadata?(metadata: { title?: string; artist?: string; artworkUrl?: string }): void;
};

export function configureLockScreenPlayer(
  player: LockScreenPlayer,
  track: Track,
  t: (key: string) => string,
  needsActivation: boolean,
): void {
  const metadata = {
    title: track.title || t("common.untitled"),
    artist: getLockScreenArtist(track),
    artworkUrl: track.thumbnailUrl || undefined,
  };

  if (needsActivation || !player.updateLockScreenMetadata) {
    player.setActiveForLockScreen(true, metadata, {
      showSeekForward: true,
      showSeekBackward: true,
    });
    return;
  }

  player.updateLockScreenMetadata(metadata);
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
    updateInterval: PLAYBACK_STATUS_UPDATE_INTERVAL_MS,
  });
  const status = useAudioPlayerStatus(player);
  const lastSaveRef = useRef(0);
  const requestIdRef = useRef(0);
  // didJustFinish 边沿标记:确保每个播放完成事件只触发一次 playNext。
  // playTrack 切换下一首是异步的(player.replace 之前 status.didJustFinish 仍为 true),
  // 无边沿保护时 effect 会因 activeTrack 变化反复重跑并再次 playNext,形成渲染循环。
  const prevFinishedRef = useRef(false);
  // 最近一次乐观 resume(resume-issued)的时间戳,用于 status-phase 的宽限期判断。
  const optimisticResumeAtRef = useRef(0);
  const lockScreenControlsActiveRef = useRef(false);

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
    }).catch((err) => console.warn("player audio mode setup failed", err));
  }, []);

  useEffect(() => {
    if (!activeTrack || phase === "idle" || phase === "resolving") return;
    if (status?.error) {
      dispatch({ type: "error", message: t("player.failed") });
      return;
    }
    const nextPhase = phaseFromAudioStatus(state, status, currentTime);
    // 仅在目标 phase 与当前不同时 dispatch。否则基于陈旧闭包的无变化 dispatch
    // (playing→playing)会在用户 pause 后把 phase=paused 覆盖回 playing。
    if (nextPhase && nextPhase !== phase) {
      // 乐观 resume 宽限期:resume-issued 后 player.play() 生效前 status 可能短暂 !playing,
      // 此时把 playing→paused 会造成按钮抖动(playing→paused→playing)。宽限期内容忍。
      const inResumeGrace =
        phase === "playing" &&
        nextPhase === "paused" &&
        optimisticResumeAtRef.current > 0 &&
        Date.now() - optimisticResumeAtRef.current < RESUME_GRACE_MS;
      if (!inResumeGrace) {
        dispatch({ type: "status-phase", phase: nextPhase });
      }
    }
  }, [activeTrack, currentTime, phase, state, status, status?.error, t]);

  // Save progress periodically
  useEffect(() => {
    if (!activeTrack || phase !== "playing") return;
    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_INTERVAL) return;
    lastSaveRef.current = now;
    void AsyncStorage.setItem(`${PROGRESS_KEY}${activeTrack.id}`, JSON.stringify({ position: currentTime }))
      .catch((err) => console.warn("player progress save failed", err));
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

  const playTrack = useCallback(async (track: Track, newQueue?: Track[], options?: { startAtSeconds?: number }) => {
    const requestId = nextRequestId();
    dispatch({ type: "play-request", requestId, track, queue: newQueue });
    ensureCacheForTrack(track);

    // Resume from saved position
    let position = options?.startAtSeconds != null ? Math.max(0, Math.floor(options.startAtSeconds)) : 0;
    if (options?.startAtSeconds == null) {
      try {
        const raw = await AsyncStorage.getItem(`${PROGRESS_KEY}${track.id}`);
        if (raw) {
          const saved = JSON.parse(raw).position || 0;
          // 保存的进度若已接近曲目结尾（历史脏数据 / didJustFinish 清除前的残留），
          // 视为已播完，从头开始而非 seek 到末尾导致"点击不播放"
          position = saved >= track.durationSeconds - 1 ? 0 : saved;
        }
      } catch {}
    }
    if (requestId !== requestIdRef.current) return;

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
      configureLockScreenPlayer(player, track, t, !lockScreenControlsActiveRef.current);
      lockScreenControlsActiveRef.current = true;
      if (position > 0) await player.seekTo(position);
      if (requestId !== requestIdRef.current) return;
      player.play();
      dispatch({ type: "play-issued", requestId, startPosition: position });
    } catch (err) {
      dispatch({ type: "error", requestId, message: playbackErrorMessage(err, t) });
    }
  }, [ensureCacheForTrack, nextRequestId, player, t]);

  const togglePlayback = useCallback(async () => {
    if (!activeTrack || playbackLoading) {
      return;
    }

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
      optimisticResumeAtRef.current = Date.now();
      dispatch({ type: "resume-issued", requestId: state.requestId, startPosition: currentTime });
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
    lockScreenControlsActiveRef.current = false;
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

  // Auto-advance on completion —— 仅在 didJustFinish 的 false→true 边沿触发一次。
  useEffect(() => {
    const finished = !!status?.didJustFinish;
    if (!finished) {
      prevFinishedRef.current = false;
      return;
    }
    if (prevFinishedRef.current || !activeTrack) {
      return;
    }
    prevFinishedRef.current = true;
    incrementPlayCount(activeTrack.id);
    // 播放完毕后清除保存的进度，否则再次点击该曲目会 seek 到接近结尾的位置
    void AsyncStorage.removeItem(`${PROGRESS_KEY}${activeTrack.id}`)
      .catch((err) => console.warn("player progress cleanup failed", err));
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
    activeTrack, queue, isPlaying, isBuffering, playbackLoading, duration, playbackSource, playbackError,
    playerPhase: phase,
    playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback,
  }), [activeTrack, queue, isPlaying, isBuffering, playbackLoading, duration, playbackSource, playbackError, phase, playTrack, togglePlayback, seekTo, playNext, playPrevious, stopPlayback]);

  return (
    <PlayerContext.Provider value={value}>
      <PlaybackProgressContext.Provider value={currentTime}>{children}</PlaybackProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

// 高频进度(每 ~100ms 更新)。仅进度条/时间显示类组件订阅,避免全树重渲染。
export function usePlaybackProgress(): number {
  return useContext(PlaybackProgressContext);
}
