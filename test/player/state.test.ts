import { describe, expect, it } from "vitest";
import type { AudioStatus } from "expo-audio";
import type { Track } from "../../src/features/playlist/storage";
import {
  initialPlayerState,
  phaseFromAudioStatus,
  playerReducer,
  type PlayerState,
} from "../../src/features/player/state";

const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  id: "job-1",
  jobId: "job-1",
  title: "A track",
  durationSeconds: 120,
  thumbnailUrl: "",
  localPath: null,
  localFilename: null,
  sourceUrl: "https://youtube.com/watch?v=1",
  fileSize: null,
  contentType: "audio/mp4",
  downloadedAt: null,
  cacheStatus: "none",
  cacheError: null,
  playCount: 0,
  lastPlayedAt: null,
  channelId: null,
  channelName: null,
  ...overrides,
});

const makeStatus = (overrides: Partial<AudioStatus> = {}): AudioStatus => ({
  id: "player",
  currentTime: 0,
  playbackState: "ready",
  timeControlStatus: "paused",
  reasonForWaitingToPlay: "unknown",
  mute: false,
  duration: 120,
  playing: false,
  loop: false,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: true,
  playbackRate: 1,
  shouldCorrectPitch: true,
  isLive: false,
  currentOffsetFromLive: null,
  error: null,
  ...overrides,
});

describe("player state machine", () => {
  it("ignores stale source and play actions from older requests", () => {
    const first = makeTrack({ id: "first", jobId: "first" });
    const second = makeTrack({ id: "second", jobId: "second" });
    let state = playerReducer(initialPlayerState, { type: "play-request", requestId: 1, track: first });
    state = playerReducer(state, { type: "play-request", requestId: 2, track: second });

    state = playerReducer(state, { type: "source-ready", requestId: 1, source: "remote" });
    expect(state.activeTrack?.id).toBe("second");
    expect(state.phase).toBe("resolving");
    expect(state.playbackSource).toBeNull();

    state = playerReducer(state, { type: "play-issued", requestId: 1, startPosition: 0 });
    expect(state.phase).toBe("resolving");
  });

  it("maps buffering statuses to buffering while startup is pending", () => {
    const state = playerReducer(initialPlayerState, {
      type: "play-request",
      requestId: 1,
      track: makeTrack(),
    });
    const loading = playerReducer(
      playerReducer(state, { type: "source-ready", requestId: 1, source: "remote" }),
      { type: "play-issued", requestId: 1, startPosition: 0 }
    );

    expect(phaseFromAudioStatus(loading, makeStatus({ isLoaded: false, playbackState: "buffering" }), 0)).toBe("buffering");
    expect(phaseFromAudioStatus(loading, makeStatus({ timeControlStatus: "waitingToPlayAtSpecifiedRate" }), 0)).toBe("buffering");
  });

  it("does not mark a new track playing from stale progress far from the requested start", () => {
    const state: PlayerState = {
      ...initialPlayerState,
      activeTrack: makeTrack(),
      phase: "loading",
      requestId: 1,
      startPosition: 0,
      playIssued: true,
    };

    expect(phaseFromAudioStatus(state, makeStatus({ playing: true, currentTime: 100 }), 100)).toBeNull();
    expect(phaseFromAudioStatus(state, makeStatus({ playing: true, currentTime: 0.3 }), 0.3)).toBe("playing");
  });

  it("does not consume native status before play has been issued for the request", () => {
    const loading = playerReducer(
      playerReducer(initialPlayerState, {
        type: "play-request",
        requestId: 1,
        track: makeTrack(),
      }),
      { type: "source-ready", requestId: 1, source: "local" }
    );

    expect(phaseFromAudioStatus(loading, makeStatus({ playing: true, currentTime: 0.3 }), 0.3)).toBeNull();
    expect(phaseFromAudioStatus(loading, makeStatus({ isLoaded: true, playing: false }), 0)).toBeNull();
  });

  it("keeps startup buffering when the player is loaded but playback did not start yet", () => {
    const state: PlayerState = {
      ...initialPlayerState,
      activeTrack: makeTrack(),
      phase: "loading",
      requestId: 1,
      startPosition: 0,
      playIssued: true,
    };

    expect(phaseFromAudioStatus(state, makeStatus({ isLoaded: true, playing: false, isBuffering: false }), 0)).toBe("buffering");
    expect(phaseFromAudioStatus({ ...state, phase: "playing" }, makeStatus({
      isLoaded: true,
      playing: false,
      isBuffering: false,
    }), 0)).toBe("paused");
  });
});
