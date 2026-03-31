import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration, getYouTubeTimestampUrl, streamJobSummary } from "../api";
import Screen from "../components/Screen";
import SummaryMarkdown from "../components/SummaryMarkdown";
import type { RootStackParamList } from "../app/navigation/types";
import { useJobDetail, useJobsList } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";
import { useServerConfig } from "../features/settings/context";
import type { SummaryStreamEvent } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

export default function PlayerScreen({ route }: Props) {
  const jobId = route.params.jobId;
  const jobsQuery = useJobsList();
  const jobQuery = useJobDetail(jobId);
  const { serverConfig } = useServerConfig();
  const [streamedSummary, setStreamedSummary] = useState("");
  const [isSummaryStreaming, setIsSummaryStreaming] = useState(false);
  const [summaryStreamError, setSummaryStreamError] = useState<string | null>(null);
  const [isSummaryComplete, setIsSummaryComplete] = useState(false);
  const summaryStreamRef = useRef<{ abort: () => void } | null>(null);
  const {
    activeJob,
    currentTime,
    duration,
    isBuffering,
    isLoaded,
    isPlaying,
    playbackProgress,
    playJob,
    playNext,
    playPrevious,
    seekBy,
    togglePlayback,
  } = usePlayer();
  const job = jobQuery.data ?? jobsQuery.data?.find((item) => item.id === jobId) ?? null;
  const isCurrentJob = activeJob?.id === job?.id;
  const effectiveCurrentTime = isCurrentJob ? currentTime : 0;
  const effectiveDuration = isCurrentJob ? duration : job?.durationSeconds || 0;
  const progress = isCurrentJob ? playbackProgress : 0;
  const isPlayButtonDisabled = job?.status !== "ready" || (isCurrentJob && !isLoaded);
  const youtubeTimestampUrl = getYouTubeTimestampUrl(job?.sourceUrl, effectiveCurrentTime);
  const canGenerateSummary = !!job && !isSummaryStreaming && job.summaryStatus !== "processing";
  const displayedSummary = streamedSummary || job?.summaryText || "";
  const displayedSummaryError = summaryStreamError || job?.summaryErrorMessage || null;

  useEffect(() => {
    if (isSummaryStreaming) {
      return;
    }

    setStreamedSummary(job?.summaryText || "");
    setSummaryStreamError(job?.summaryErrorMessage || null);
    setIsSummaryComplete(job?.summaryStatus === "ready");
  }, [isSummaryStreaming, job?.summaryErrorMessage, job?.summaryStatus, job?.summaryText]);

  useEffect(() => () => {
    summaryStreamRef.current?.abort();
  }, []);

  function handleSummaryEvent(event: SummaryStreamEvent) {
    if (event.type === "start") {
      setStreamedSummary("");
      setSummaryStreamError(null);
      setIsSummaryComplete(false);
      return;
    }

    if (event.type === "delta") {
      setStreamedSummary(event.text);
      return;
    }

    if (event.type === "complete") {
      setStreamedSummary(event.job.summaryText || "");
      setSummaryStreamError(null);
      setIsSummaryStreaming(false);
      setIsSummaryComplete(true);
      void jobsQuery.refetch();
      void jobQuery.refetch();
      return;
    }

    setSummaryStreamError(event.error);
    setIsSummaryStreaming(false);
    setIsSummaryComplete(true);
    void jobsQuery.refetch();
    void jobQuery.refetch();
  }

  return (
    <Screen>
      {!job ? (
        <ActivityIndicator color="#b65a36" />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.title}>{job.title || "Untitled job"}</Text>
            <Text style={styles.subtitle}>{job.channelName || job.sourceUrl}</Text>
            <Text style={styles.status}>
              当前状态：{job.status === "ready" ? "可播放" : job.status === "processing" ? "转换中" : job.status === "queued" ? "排队中" : "失败"}
            </Text>
          </View>

          {job.status !== "ready" ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>
                {job.status === "failed" ? "这次转换失败了" : "音频还没有准备好"}
              </Text>
              <Text style={styles.noticeText}>
                {job.status === "failed"
                  ? job.errorMessage || "服务端返回了失败状态，后续可以在媒体库里补重试操作。"
                  : "当前页面会继续跟踪这个任务，等任务转成可播放后这里会直接切到音频控制。"}
              </Text>
            </View>
          ) : null}

          {job.status === "ready" && !isCurrentJob ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>这条音频已经可播放</Text>
              <Text style={styles.noticeText}>点击下面主按钮后，会把它切换成当前播放内容。</Text>
            </View>
          ) : null}

          <View style={styles.playerCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {formatDuration(Math.floor(effectiveCurrentTime))} / {formatDuration(Math.floor(effectiveDuration))}
              </Text>
              <Text style={styles.progressText}>
                {job.status === "ready" ? (isBuffering ? "缓冲中" : isPlaying ? "播放中" : "已就绪") : "等待处理"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            {job.errorMessage ? <Text style={styles.errorText}>{job.errorMessage}</Text> : null}

            <View style={styles.controls}>
              <Pressable style={styles.secondaryButton} onPress={playPrevious}>
                <Text style={styles.secondaryButtonText}>上一首</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isPlayButtonDisabled && styles.buttonDisabled]}
                disabled={isPlayButtonDisabled}
                onPress={() => {
                  if (!job || job.status !== "ready") {
                    return;
                  }

                  if (!isCurrentJob) {
                    playJob(job, jobsQuery.data ?? [job]);
                    return;
                  }

                  togglePlayback();
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isCurrentJob && isPlaying ? "暂停" : "播放"}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={playNext}>
                <Text style={styles.secondaryButtonText}>下一首</Text>
              </Pressable>
            </View>

            <View style={styles.controls}>
              <Pressable
                style={[styles.secondaryButton, job.status !== "ready" && styles.buttonDisabled]}
                disabled={job.status !== "ready"}
                onPress={() => seekBy(-15)}
              >
                <Text style={styles.secondaryButtonText}>-15 秒</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, !youtubeTimestampUrl && styles.buttonDisabled]}
                disabled={!youtubeTimestampUrl}
                onPress={() => {
                  if (youtubeTimestampUrl) {
                    void Linking.openURL(youtubeTimestampUrl);
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>打开 YouTube</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, job.status !== "ready" && styles.buttonDisabled]}
                disabled={job.status !== "ready"}
                onPress={() => seekBy(15)}
              >
                <Text style={styles.secondaryButtonText}>+15 秒</Text>
              </Pressable>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>视频总结</Text>
                <Pressable
                  style={[styles.summaryButton, !canGenerateSummary && styles.buttonDisabled]}
                  disabled={!canGenerateSummary}
                  onPress={() => {
                    if (!job) {
                      return;
                    }

                    summaryStreamRef.current?.abort();
                    setIsSummaryStreaming(true);
                    setIsSummaryComplete(false);
                    setStreamedSummary("");
                    setSummaryStreamError(null);

                    summaryStreamRef.current = streamJobSummary(serverConfig, job.id, {
                      onEvent: handleSummaryEvent,
                      onError: (message) => {
                        setSummaryStreamError(message);
                        setIsSummaryStreaming(false);
                        setIsSummaryComplete(true);
                      },
                      onClose: () => {
                        summaryStreamRef.current = null;
                      },
                    });
                  }}
                >
                  {isSummaryStreaming ? (
                    <ActivityIndicator color="#fff7ef" />
                  ) : (
                    <Text style={styles.summaryButtonText}>
                      {displayedSummary ? "重新生成" : "生成总结"}
                    </Text>
                  )}
                </Pressable>
              </View>

              {isSummaryStreaming || job.summaryStatus === "processing" ? (
                <Text style={styles.summaryBody}>Gemini 正在流式生成总结，下面会实时追加内容。</Text>
              ) : null}

              {displayedSummaryError ? (
                <Text style={styles.summaryError}>{displayedSummaryError}</Text>
              ) : null}

              {displayedSummary ? (
                <SummaryMarkdown content={displayedSummary} isComplete={isSummaryComplete && !isSummaryStreaming} />
              ) : job.summaryStatus === "idle" ? (
                <Text style={styles.summaryPlaceholder}>点击按钮后，服务端会按需生成视频总结。</Text>
              ) : null}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#211c18",
    borderRadius: 28,
    gap: 8,
    padding: 20,
  },
  title: {
    color: "#fff8f0",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#d8c6b4",
    fontSize: 14,
    lineHeight: 20,
  },
  status: {
    color: "#f7d8a0",
    fontSize: 13,
    fontWeight: "700",
  },
  playerCard: {
    backgroundColor: "#fff9f3",
    borderColor: "#d8c9b8",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  noticeCard: {
    backgroundColor: "#fff4e7",
    borderColor: "#ecd3ad",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  noticeTitle: {
    color: "#6d371f",
    fontSize: 16,
    fontWeight: "800",
  },
  noticeText: {
    color: "#7c5b45",
    fontSize: 14,
    lineHeight: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: "#5f4c3f",
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "#e7dac9",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#b65a36",
    height: "100%",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#b65a36",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#fff7ef",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#f1dfc7",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#6d371f",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: "#b23f3f",
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: "#fff4e7",
    borderColor: "#ecd3ad",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  summaryTitle: {
    color: "#6d371f",
    fontSize: 17,
    fontWeight: "800",
  },
  summaryButton: {
    alignItems: "center",
    backgroundColor: "#b65a36",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: 14,
  },
  summaryButtonText: {
    color: "#fff7ef",
    fontSize: 14,
    fontWeight: "800",
  },
  summaryBody: {
    color: "#5d4536",
    fontSize: 14,
    lineHeight: 22,
  },
  summaryPlaceholder: {
    color: "#7c5b45",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryError: {
    color: "#b23f3f",
    fontSize: 14,
    lineHeight: 20,
  },
});
