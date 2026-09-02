import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { useTranslation } from "../../i18n";
import { screenshotDemoMode } from "../demoMode/config";
import { usePlayer } from "../player/context";
import {
  initialAppReviewPromptState,
  markPromptResolved,
  registerPlayedContent,
  registerSession,
  shouldShowReviewPrompt,
  type AppReviewPromptState,
} from "./logic";
import { loadAppReviewPromptState, saveAppReviewPromptState } from "./storage";
import { requestAppReview, SUPPORT_URL } from "./requestReview";

// 无 UI 组件：挂载在 PlayerProvider 内，负责
// 1) 每次打开 app 计一次使用会话（AppState active 边沿，每次激活最多 +1）
// 2) 播放确认进入 playing 时按内容去重计数
// 3) 条件满足后弹一次中性评分引导（原生 Alert），并按用户选择记录/节流
// 评分引导仅面向 iOS 正式使用场景：screenshot demo 与其它平台一律不触发。
export default function AppReviewPrompt() {
  const { t } = useTranslation();
  const { activeTrack, playerPhase } = usePlayer();
  const stateRef = useRef<AppReviewPromptState>(initialAppReviewPromptState);
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const activationCountedRef = useRef(false);
  const promptVisibleRef = useRef(false);

  const update = (mutate: (state: AppReviewPromptState) => AppReviewPromptState) => {
    const next = mutate(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    void saveAppReviewPromptState(next).catch((err) => console.warn("app review state save failed", err));
    maybeShowPrompt(next);
  };

  const maybeShowPrompt = (state: AppReviewPromptState) => {
    if (promptVisibleRef.current) return;
    if (
      !shouldShowReviewPrompt(state, {
        now: Date.now(),
        platform: Platform.OS,
        demoMode: screenshotDemoMode,
      })
    ) {
      return;
    }
    promptVisibleRef.current = true;

    const resolve = (outcome: "declined" | "engaged") => {
      promptVisibleRef.current = false;
      update((current) => markPromptResolved(current, Date.now(), outcome));
    };

    Alert.alert(t("appReview.title"), t("appReview.message"), [
      {
        text: t("appReview.rate"),
        onPress: () => {
          resolve("engaged");
          void requestAppReview();
        },
      },
      {
        text: t("appReview.feedback"),
        onPress: () => {
          resolve("engaged");
          void Linking.openURL(SUPPORT_URL);
        },
      },
      { text: t("appReview.later"), style: "cancel", onPress: () => resolve("declined") },
    ]);
  };

  const countSessionOnce = () => {
    if (activationCountedRef.current) return;
    activationCountedRef.current = true;
    update(registerSession);
  };

  useEffect(() => {
    // screenshot demo 构建既不弹引导也不写跟踪状态
    if (screenshotDemoMode) return;
    let cancelled = false;
    void (async () => {
      const stored = await loadAppReviewPromptState();
      if (cancelled) return;
      stateRef.current = stored;
      loadedRef.current = true;
      setLoaded(true);
      // 本次打开 app 计一次会话（冷启动时 currentState 已是 active）
      if (AppState.currentState === "active") countSessionOnce();
    })();

    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        if (loadedRef.current) countSessionOnce();
      } else {
        // 退到后台后重置，下一次激活再计一次
        activationCountedRef.current = false;
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
    // countSessionOnce 经 ref 读最新值，无需进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 播放确认进入 playing 时记录内容（按 id 去重；内存已记录的直接跳过）
  useEffect(() => {
    if (screenshotDemoMode || !loaded) return;
    if (!activeTrack || playerPhase !== "playing") return;
    if (stateRef.current.playedContentIds.includes(activeTrack.id)) return;
    update((current) => registerPlayedContent(current, activeTrack.id));
    // activeTrack 引用可能因元数据刷新变化，用 id 判断即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, activeTrack?.id, playerPhase]);

  return null;
}
