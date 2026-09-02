// App 评分引导的纯触发逻辑。
// 全部为纯函数：时间/平台/演示模式通过参数注入，方便单测与节流重置。

export const REQUIRED_DISTINCT_PLAYS = 3;
export const REQUIRED_SESSIONS = 2;
// 「以后再说」之后的冷却期：至少 30 天内不再打扰。
export const REPROMPT_THROTTLE_MS = 30 * 24 * 60 * 60 * 1000;

export type AppReviewPromptState = {
  // 已成功播放过的不同内容 id（按内容去重，重复播放不重复计数）
  playedContentIds: string[];
  // 累计使用会话数（每次打开 app 最多 +1）
  sessionCount: number;
  // 上次弹出引导的时间戳（任何按钮都会记录）
  promptedAt: number | null;
  // 用户选择「以后再说」的时间戳
  declinedAt: number | null;
  // 用户已选择「去评分」或「反馈问题」的时间戳（此后不再自动弹出）
  engagedAt: number | null;
};

export const initialAppReviewPromptState: AppReviewPromptState = {
  playedContentIds: [],
  sessionCount: 0,
  promptedAt: null,
  declinedAt: null,
  engagedAt: null,
};

export type ReviewPromptOutcome = "declined" | "engaged";

/** 记录一次「成功播放某内容」。重复内容返回原 state 引用，便于调用方跳过持久化。 */
export function registerPlayedContent(state: AppReviewPromptState, contentId: string): AppReviewPromptState {
  if (state.playedContentIds.includes(contentId)) return state;
  return { ...state, playedContentIds: [...state.playedContentIds, contentId] };
}

/** 记录一次使用会话（由调用方保证每次 app 打开只调用一次）。 */
export function registerSession(state: AppReviewPromptState): AppReviewPromptState {
  return { ...state, sessionCount: state.sessionCount + 1 };
}

/** 弹出引导后按用户选择记录状态。 */
export function markPromptResolved(
  state: AppReviewPromptState,
  now: number,
  outcome: ReviewPromptOutcome,
): AppReviewPromptState {
  return {
    ...state,
    promptedAt: now,
    declinedAt: outcome === "declined" ? now : state.declinedAt,
    engagedAt: outcome === "engaged" ? now : state.engagedAt,
  };
}

export type ReviewPromptGuardOptions = {
  now: number;
  platform: string;
  demoMode: boolean;
};

/**
 * 是否应弹出评分引导：
 * - 仅 iOS、非 screenshot demo 模式
 * - 首次启动不弹（需跨 >= 2 次会话）
 * - 至少成功播放过 3 个不同内容
 * - 用户已主动评分/反馈过则永不再弹；「以后再说」后至少 30 天节流
 */
export function shouldShowReviewPrompt(state: AppReviewPromptState, options: ReviewPromptGuardOptions): boolean {
  if (options.demoMode) return false;
  if (options.platform !== "ios") return false;
  if (state.engagedAt !== null) return false;
  if (state.promptedAt !== null && options.now - state.promptedAt < REPROMPT_THROTTLE_MS) return false;
  return state.playedContentIds.length >= REQUIRED_DISTINCT_PLAYS && state.sessionCount >= REQUIRED_SESSIONS;
}
