import type { AudioStatus } from "expo-audio";
import type { Track } from "../playlist/storage";

export type PlaybackSource = "local" | "remote";
export type PlayerPhase = "idle" | "resolving" | "loading" | "buffering" | "playing" | "paused" | "error";

export type PlayerState = {
  activeTrack: Track | null;
  queue: Track[];
  phase: PlayerPhase;
  playbackSource: PlaybackSource | null;
  playbackError: string | null;
  requestId: number;
  startPosition: number;
  playIssued: boolean;
};

export type PlayerAction =
  | { type: "play-request"; requestId: number; track: Track; queue?: Track[] }
  | { type: "source-ready"; requestId: number; source: PlaybackSource }
  | { type: "play-issued"; requestId: number; startPosition: number }
  | { type: "status-phase"; phase: PlayerPhase }
  | { type: "pause" }
  | { type: "error"; requestId?: number; message: string }
  | { type: "stop"; requestId: number }
  | { type: "track-updated"; track: Track };

const PLAY_START_PROGRESS_THRESHOLD = 0.25;
const PLAY_START_STALE_STATUS_WINDOW = 5;

export const initialPlayerState: PlayerState = {
  activeTrack: null,
  queue: [],
  phase: "idle",
  playbackSource: null,
  playbackError: null,
  requestId: 0,
  startPosition: 0,
  playIssued: false,
};

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play-request":
      return {
        activeTrack: action.track,
        queue: action.queue ?? state.queue,
        phase: "resolving",
        playbackSource: null,
        playbackError: null,
        requestId: action.requestId,
        startPosition: 0,
        playIssued: false,
      };
    case "source-ready":
      if (action.requestId !== state.requestId) return state;
      return {
        ...state,
        phase: "loading",
        playbackSource: action.source,
        playbackError: null,
        playIssued: false,
      };
    case "play-issued":
      if (action.requestId !== state.requestId) return state;
      return {
        ...state,
        phase: "loading",
        playbackError: null,
        startPosition: action.startPosition,
        playIssued: true,
      };
    case "status-phase":
      if (!state.activeTrack || state.phase === "idle" || state.phase === "error") return state;
      return state.phase === action.phase ? state : { ...state, phase: action.phase };
    case "pause":
      if (!state.activeTrack) return state;
      return { ...state, phase: "paused", playIssued: false };
    case "error":
      if (action.requestId !== undefined && action.requestId !== state.requestId) return state;
      return { ...state, phase: "error", playbackError: action.message };
    case "stop":
      return { ...initialPlayerState, requestId: action.requestId };
    case "track-updated":
      if (state.activeTrack?.id !== action.track.id) return state;
      return { ...state, activeTrack: action.track };
    default:
      return state;
  }
}

export function isAudioMetadataReady(duration: number, currentTime: number): boolean {
  return duration > 0 || currentTime > 0;
}

export function isPlaybackStartConfirmed(currentTime: number, startPosition: number): boolean {
  return (
    currentTime >= startPosition + PLAY_START_PROGRESS_THRESHOLD &&
    currentTime <= startPosition + PLAY_START_STALE_STATUS_WINDOW
  );
}

export function isPlaybackLoadingPhase(phase: PlayerPhase): boolean {
  return phase === "resolving" || phase === "loading" || phase === "buffering";
}

export function phaseFromAudioStatus(
  state: PlayerState,
  status: AudioStatus | null | undefined,
  currentTime: number
): PlayerPhase | null {
  if (!state.activeTrack || state.phase === "idle" || state.phase === "resolving" || state.phase === "error") {
    return null;
  }
  if (!status) return null;
  if (!state.playIssued) return null;
  if (
    status.isBuffering ||
    status.timeControlStatus === "waitingToPlayAtSpecifiedRate" ||
    (isPlaybackLoadingPhase(state.phase) && !status.isLoaded)
  ) {
    return "buffering";
  }
  if (
    status.isLoaded &&
    status.playing &&
    (state.phase === "playing" || isPlaybackStartConfirmed(currentTime, state.startPosition))
  ) {
    return "playing";
  }
  if (
    status.isLoaded &&
    !status.playing &&
    state.phase === "playing"
  ) {
    return "paused";
  }
  if (status.isLoaded && !status.playing && isPlaybackLoadingPhase(state.phase)) {
    return "buffering";
  }
  return null;
}
