import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialAppReviewPromptState, type AppReviewPromptState } from "./logic";

const STORAGE_KEY = "app_review_prompt_state_v1";

type StoredState = Partial<AppReviewPromptState>;

function coerce(stored: StoredState | null): AppReviewPromptState {
  if (!stored) return initialAppReviewPromptState;
  return {
    playedContentIds: Array.isArray(stored.playedContentIds) ? stored.playedContentIds : [],
    sessionCount: typeof stored.sessionCount === "number" ? stored.sessionCount : 0,
    promptedAt: typeof stored.promptedAt === "number" ? stored.promptedAt : null,
    declinedAt: typeof stored.declinedAt === "number" ? stored.declinedAt : null,
    engagedAt: typeof stored.engagedAt === "number" ? stored.engagedAt : null,
  };
}

export async function loadAppReviewPromptState(): Promise<AppReviewPromptState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return coerce(raw ? (JSON.parse(raw) as StoredState) : null);
  } catch {
    // 存储损坏时当作从未触发过，静默降级。
    return initialAppReviewPromptState;
  }
}

export async function saveAppReviewPromptState(state: AppReviewPromptState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
