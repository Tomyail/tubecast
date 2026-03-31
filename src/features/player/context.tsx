import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getPlayableAudioUrl } from "../../api";
import type { Job } from "../../types";
import { useJobsList } from "../jobs/hooks";
import { useServerConfig } from "../settings/context";
import { loadPlaybackProgress, savePlaybackProgress } from "./storage";

type PlayerContextValue = {
  activeJob: Job | null;
  queue: Job[];
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackProgress: number;
  setQueue: (jobs: Job[]) => void;
  setActiveJob: (job: Job | null, queue?: Job[]) => void;
  playJob: (job: Job, queue?: Job[]) => void;
  togglePlayback: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (deltaSeconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function getPlaybackProgressKey(job: Job | null) {
  if (!job) {
    return null;
  }

  return job.sourceKey || job.sourceId || job.sourceUrl || job.id;
}

function isMissingNativeSharedObjectError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ERR_NATIVE_SHARED_OBJECT_NOT_FOUND";
}

function safeClearLockScreenControls(player: ReturnType<typeof useAudioPlayer>) {
  try {
    player.clearLockScreenControls();
  } catch (error) {
    if (!isMissingNativeSharedObjectError(error)) {
      throw error;
    }
  }
}

function safeSetActiveForLockScreen(
  player: ReturnType<typeof useAudioPlayer>,
  metadata: Parameters<ReturnType<typeof useAudioPlayer>["setActiveForLockScreen"]>[1],
) {
  try {
    player.setActiveForLockScreen(true, metadata);
  } catch (error) {
    if (!isMissingNativeSharedObjectError(error)) {
      throw error;
    }
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { serverConfig } = useServerConfig();
  const jobsQuery = useJobsList();
  const [activeJob, setActiveJobState] = useState<Job | null>(null);
  const [queue, setQueueState] = useState<Job[]>([]);
  const playableAudioUrl = getPlayableAudioUrl(activeJob, serverConfig);
  const player = useAudioPlayer(playableAudioUrl, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const status = useAudioPlayerStatus(player);
  const lastPersistedSecondRef = useRef(-1);
  const restoredPlaybackKeyRef = useRef<string | null>(null);
  const handledFinishedJobIdRef = useRef<string | null>(null);
  const hasHydratedReadyJobsRef = useRef(false);
  const knownReadyJobIdsRef = useRef<Set<string>>(new Set());
  const pendingAutoPlayJobIdRef = useRef<string | null>(null);
  const pendingAutoPlayPlaybackKeyRef = useRef<string | null>(null);
  const playbackProgressKey = getPlaybackProgressKey(activeJob);

  function setCurrentJob(job: Job | null, nextQueue?: Job[], shouldAutoPlay = false) {
    if (nextQueue) {
      setQueueState(nextQueue);
    }

    pendingAutoPlayJobIdRef.current = shouldAutoPlay ? job?.id ?? null : null;
    pendingAutoPlayPlaybackKeyRef.current = shouldAutoPlay ? getPlaybackProgressKey(job) : null;
    setActiveJobState(job);
  }

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    const jobs = jobsQuery.data;
    if (!jobs) {
      return;
    }

    setQueueState(jobs);

    const readyJobs = jobs.filter((job) => job.status === "ready");
    const nextReadyJobIds = new Set(readyJobs.map((job) => job.id));

    if (!hasHydratedReadyJobsRef.current) {
      hasHydratedReadyJobsRef.current = true;
      knownReadyJobIdsRef.current = nextReadyJobIds;
      return;
    }

    const newReadyJobs = readyJobs.filter((job) => !knownReadyJobIdsRef.current.has(job.id));
    knownReadyJobIdsRef.current = nextReadyJobIds;

    if (!newReadyJobs.length || status.playing || status.isBuffering) {
      return;
    }

    const latestReadyJob = newReadyJobs[0];
    pendingAutoPlayJobIdRef.current = latestReadyJob.id;
    pendingAutoPlayPlaybackKeyRef.current = getPlaybackProgressKey(latestReadyJob);
    setActiveJobState(latestReadyJob);
  }, [jobsQuery.data, status.isBuffering, status.playing]);

  useEffect(() => {
    if (!playableAudioUrl) {
      player.pause();
      safeClearLockScreenControls(player);
      return;
    }

    safeSetActiveForLockScreen(player, {
      title: activeJob?.title || "YT Audio",
      artist: activeJob?.channelName || "yt-audio",
      artworkUrl: activeJob?.thumbnailUrl || undefined,
    });

    return () => {
      safeClearLockScreenControls(player);
    };
  }, [activeJob, playableAudioUrl, player]);

  useEffect(() => {
    restoredPlaybackKeyRef.current = null;
    lastPersistedSecondRef.current = -1;
  }, [playbackProgressKey]);

  useEffect(() => {
    if (!playableAudioUrl || !playbackProgressKey || !status.isLoaded) {
      return;
    }

    if (restoredPlaybackKeyRef.current === playbackProgressKey) {
      return;
    }

    restoredPlaybackKeyRef.current = playbackProgressKey;
    void loadPlaybackProgress(playbackProgressKey).then(async (savedPosition) => {
      if (savedPosition <= 0) {
        if (
          pendingAutoPlayJobIdRef.current === activeJob?.id &&
          pendingAutoPlayPlaybackKeyRef.current === playbackProgressKey
        ) {
          player.play();
          pendingAutoPlayJobIdRef.current = null;
          pendingAutoPlayPlaybackKeyRef.current = null;
        }
        return;
      }

      if (status.duration > 0 && savedPosition >= status.duration - 3) {
        await savePlaybackProgress(playbackProgressKey, 0);
      } else {
        await player.seekTo(savedPosition);
      }

      if (
        pendingAutoPlayJobIdRef.current === activeJob?.id &&
        pendingAutoPlayPlaybackKeyRef.current === playbackProgressKey
      ) {
        player.play();
        pendingAutoPlayJobIdRef.current = null;
        pendingAutoPlayPlaybackKeyRef.current = null;
      }
    });
  }, [activeJob?.id, playableAudioUrl, playbackProgressKey, player, status.duration, status.isLoaded]);

  useEffect(() => {
    if (!playbackProgressKey || !status.isLoaded) {
      return;
    }

    if (status.didJustFinish) {
      void savePlaybackProgress(playbackProgressKey, 0);
      lastPersistedSecondRef.current = -1;
      return;
    }

    const currentSecond = Math.floor(status.currentTime || 0);
    if (currentSecond === lastPersistedSecondRef.current || currentSecond % 5 !== 0) {
      return;
    }

    lastPersistedSecondRef.current = currentSecond;
    void savePlaybackProgress(playbackProgressKey, currentSecond);
  }, [playbackProgressKey, status.currentTime, status.didJustFinish, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish || !activeJob) {
      handledFinishedJobIdRef.current = null;
      return;
    }

    if (handledFinishedJobIdRef.current === activeJob.id) {
      return;
    }

    handledFinishedJobIdRef.current = activeJob.id;

    const currentIndex = queue.findIndex((job) => job.id === activeJob.id);
    if (currentIndex < 0) {
      return;
    }

    const nextReadyJob = queue.slice(currentIndex + 1).find((job) => job.status === "ready");
    if (nextReadyJob) {
      pendingAutoPlayJobIdRef.current = nextReadyJob.id;
      pendingAutoPlayPlaybackKeyRef.current = getPlaybackProgressKey(nextReadyJob);
      setActiveJobState(nextReadyJob);
    }
  }, [activeJob, queue, status.didJustFinish]);

  const value = useMemo<PlayerContextValue>(() => ({
    activeJob,
    queue,
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    currentTime: status.currentTime || 0,
    duration: status.duration || activeJob?.durationSeconds || 0,
    playbackProgress:
      status.duration && status.duration > 0
        ? Math.min((status.currentTime || 0) / status.duration, 1)
        : 0,
    setQueue: (jobs) => {
      setQueueState(jobs);
    },
    setActiveJob: (job, nextQueue) => {
      setCurrentJob(job, nextQueue, false);
    },
    playJob: (job, nextQueue) => {
      setCurrentJob(job, nextQueue, true);
    },
    togglePlayback: () => {
      if (!playableAudioUrl) {
        return;
      }

      if (status.playing) {
        player.pause();
        return;
      }

      player.play();
    },
    seekTo: (seconds) => {
      if (!playableAudioUrl) {
        return;
      }

      void player.seekTo(Math.max(0, seconds));
    },
    seekBy: (deltaSeconds) => {
      if (!playableAudioUrl) {
        return;
      }

      const nextTime = Math.max(0, (status.currentTime || 0) + deltaSeconds);
      void player.seekTo(nextTime);
    },
    playNext: () => {
      if (!activeJob) {
        return;
      }

      const currentIndex = queue.findIndex((job) => job.id === activeJob.id);
      if (currentIndex < 0) {
        return;
      }

      const nextReadyJob = queue.slice(currentIndex + 1).find((job) => job.status === "ready");
      if (nextReadyJob) {
        setActiveJobState(nextReadyJob);
      }
    },
    playPrevious: () => {
      if (!activeJob) {
        return;
      }

      const currentIndex = queue.findIndex((job) => job.id === activeJob.id);
      if (currentIndex <= 0) {
        return;
      }

      const previousReadyJobs = queue.slice(0, currentIndex).filter((job) => job.status === "ready");
      const previousReadyJob = previousReadyJobs[previousReadyJobs.length - 1];
      if (previousReadyJob) {
        setActiveJobState(previousReadyJob);
      }
    },
  }), [
    activeJob,
    playableAudioUrl,
    player,
    queue,
    status.currentTime,
    status.duration,
    status.isBuffering,
    status.isLoaded,
    status.playing,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }

  return context;
}
