import { describe, expect, it } from "vitest";
import {
  initialAppReviewPromptState,
  markPromptResolved,
  registerPlayedContent,
  registerSession,
  REPROMPT_THROTTLE_MS,
  shouldShowReviewPrompt,
} from "../../src/features/appReview/logic";

const NOW = 1_800_000_000_000;
const IOS = { now: NOW, platform: "ios", demoMode: false };

function playedState(ids: string[], sessions: number) {
  let state = initialAppReviewPromptState;
  for (let i = 0; i < sessions; i += 1) state = registerSession(state);
  for (const id of ids) state = registerPlayedContent(state, id);
  return state;
}

describe("registerPlayedContent", () => {
  it("dedupes repeated content ids", () => {
    let state = registerPlayedContent(initialAppReviewPromptState, "a");
    state = registerPlayedContent(state, "a");
    state = registerPlayedContent(state, "a");
    expect(state.playedContentIds).toEqual(["a"]);
  });

  it("keeps accumulating distinct content", () => {
    let state = initialAppReviewPromptState;
    for (const id of ["a", "b", "c", "d"]) state = registerPlayedContent(state, id);
    expect(state.playedContentIds).toEqual(["a", "b", "c", "d"]);
  });
});

describe("shouldShowReviewPrompt", () => {
  it("triggers after 3 distinct contents across 2 sessions on iOS", () => {
    expect(shouldShowReviewPrompt(playedState(["a", "b", "c"], 2), IOS)).toBe(true);
  });

  it("does not trigger with fewer than 3 distinct contents", () => {
    expect(shouldShowReviewPrompt(playedState(["a", "b"], 2), IOS)).toBe(false);
  });

  it("counts distinct contents, not replays", () => {
    let state = initialAppReviewPromptState;
    state = registerSession(state);
    state = registerSession(state);
    // 同一内容反复播放，依然只有 1 个不同内容
    for (let i = 0; i < 10; i += 1) state = registerPlayedContent(state, "a");
    expect(state.playedContentIds).toHaveLength(1);
    expect(shouldShowReviewPrompt(state, IOS)).toBe(false);
  });

  it("never triggers on first launch (single session)", () => {
    expect(shouldShowReviewPrompt(playedState(["a", "b", "c"], 1), IOS)).toBe(false);
  });

  it("does not trigger with zero activity", () => {
    expect(shouldShowReviewPrompt(playedState([], 0), IOS)).toBe(false);
  });

  it("does not trigger on non-iOS platforms", () => {
    const state = playedState(["a", "b", "c"], 2);
    expect(shouldShowReviewPrompt(state, { now: NOW, platform: "android", demoMode: false })).toBe(false);
    expect(shouldShowReviewPrompt(state, { now: NOW, platform: "web", demoMode: false })).toBe(false);
  });

  it("does not trigger in screenshot demo mode", () => {
    expect(shouldShowReviewPrompt(playedState(["a", "b", "c"], 2), { ...IOS, demoMode: true })).toBe(false);
  });
});

describe("throttle after prompting", () => {
  it("suppresses for at least 30 days after declining", () => {
    const declined = markPromptResolved(playedState(["a", "b", "c"], 2), NOW, "declined");
    expect(shouldShowReviewPrompt(declined, IOS)).toBe(false);
    // 29 天后仍不弹
    expect(shouldShowReviewPrompt(declined, { ...IOS, now: NOW + REPROMPT_THROTTLE_MS - 1 })).toBe(false);
    // 满 30 天后且条件仍满足时可再弹
    expect(shouldShowReviewPrompt(declined, { ...IOS, now: NOW + REPROMPT_THROTTLE_MS })).toBe(true);
    expect(declined.declinedAt).toBe(NOW);
    expect(declined.engagedAt).toBeNull();
  });

  it("never re-prompts after the user engaged (rated or sent feedback)", () => {
    const engaged = markPromptResolved(playedState(["a", "b", "c"], 2), NOW, "engaged");
    expect(shouldShowReviewPrompt(engaged, { ...IOS, now: NOW + REPROMPT_THROTTLE_MS * 10 })).toBe(false);
    expect(engaged.engagedAt).toBe(NOW);
  });

  it("declining keeps prior engaged flag untouched and vice versa", () => {
    const engaged = markPromptResolved(initialAppReviewPromptState, NOW, "engaged");
    const declinedAfter = markPromptResolved(engaged, NOW + 1000, "declined");
    expect(declinedAfter.engagedAt).toBe(NOW);
    expect(shouldShowReviewPrompt(declinedAfter, { ...IOS, now: NOW + REPROMPT_THROTTLE_MS * 10 })).toBe(false);
  });
});

describe("registerSession", () => {
  it("increments session count by one per call", () => {
    let state = initialAppReviewPromptState;
    state = registerSession(state);
    state = registerSession(state);
    expect(state.sessionCount).toBe(2);
  });
});
