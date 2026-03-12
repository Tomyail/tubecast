import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration, getYouTubeTimestampUrl } from "../api";
import Screen from "../components/Screen";
import type { RootStackParamList } from "../app/navigation/types";
import { useJobDetail, useJobsList } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

export default function PlayerScreen({ route }: Props) {
  const jobId = route.params.jobId;
  const jobsQuery = useJobsList();
  const jobQuery = useJobDetail(jobId);
  const {
    activeJob,
    currentTime,
    duration,
    isBuffering,
    isLoaded,
    isPlaying,
    playbackProgress,
    playNext,
    playPrevious,
    seekBy,
    setActiveJob,
    togglePlayback,
  } = usePlayer();
  const job = jobQuery.data ?? jobsQuery.data?.find((item) => item.id === jobId) ?? null;
  const isCurrentJob = activeJob?.id === job?.id;
  const effectiveCurrentTime = isCurrentJob ? currentTime : 0;
  const effectiveDuration = isCurrentJob ? duration : job?.durationSeconds || 0;
  const progress = isCurrentJob ? playbackProgress : 0;
  const youtubeTimestampUrl = getYouTubeTimestampUrl(job?.sourceUrl, effectiveCurrentTime);

  useEffect(() => {
    if (job?.status === "ready" && activeJob?.id !== job.id) {
      setActiveJob(job, jobsQuery.data ?? [job]);
    }
  }, [activeJob?.id, job, jobsQuery.data, setActiveJob]);

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
                style={[styles.primaryButton, job.status !== "ready" && styles.buttonDisabled]}
                disabled={job.status !== "ready" || !isLoaded}
                onPress={() => {
                  if (!job || job.status !== "ready") {
                    return;
                  }

                  if (!isCurrentJob) {
                    setActiveJob(job, jobsQuery.data ?? [job]);
                    return;
                  }

                  togglePlayback();
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isCurrentJob ? (isPlaying ? "暂停" : "播放") : "播放这条音频"}
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
});
