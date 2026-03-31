import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList, RootTabParamList } from "../app/navigation/types";
import JobCard from "../components/JobCard";
import Screen from "../components/Screen";
import { useCreateJob, useJobsList } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";
import { useServerConfig } from "../features/settings/context";

function looksLikeYouTubeUrl(value: string) {
  return /(?:youtube\.com|youtu\.be)/i.test(value);
}

export default function HomeScreen() {
  const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [sourceUrl, setSourceUrl] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState("");
  const { hasServerConfig, normalizedBaseUrl } = useServerConfig();
  const jobsQuery = useJobsList();
  const createJobMutation = useCreateJob();
  const { playJob } = usePlayer();
  const latestJob = jobsQuery.data?.[0] ?? null;

  const submitDisabled = createJobMutation.isPending || !sourceUrl.trim() || !hasServerConfig;

  useEffect(() => {
    void Clipboard.getStringAsync().then((value) => {
      const trimmed = value.trim();
      if (trimmed && looksLikeYouTubeUrl(trimmed)) {
        setClipboardUrl(trimmed);
      }
    });
  }, []);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YT Audio</Text>
        <Text style={styles.title}>把链接变成可后台播放的音频</Text>
        <Text style={styles.subtitle}>
          现在的重点是缩短主流程。首页只负责提交链接和承接最近一次任务状态。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>开始转换</Text>
        {!hasServerConfig ? (
          <>
            <Text style={styles.helperText}>还没有可用的服务端地址，先去设置页配置后端连接。</Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => tabNavigation.navigate("Settings")}
            >
              <Text style={styles.secondaryButtonText}>前往设置</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.helperText}>当前服务端：{normalizedBaseUrl}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              onChangeText={setSourceUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor="#8b8478"
              style={styles.input}
              value={sourceUrl}
            />
            {clipboardUrl && clipboardUrl !== sourceUrl ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setSourceUrl(clipboardUrl)}
              >
                <Text style={styles.secondaryButtonText}>粘贴剪贴板中的 YouTube 链接</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={submitDisabled}
              style={[styles.primaryButton, submitDisabled && styles.buttonDisabled]}
              onPress={() => {
                void createJobMutation.mutateAsync({ sourceUrl }).then((result) => {
                    setSourceUrl("");
                  if (result.job.status === "ready") {
                    playJob(result.job, jobsQuery.data ?? [result.job]);
                    stackNavigation.navigate("Player", { jobId: result.job.id });
                  }
                }).catch((error: unknown) => {
                  Alert.alert("Request failed", error instanceof Error ? error.message : "Unable to create job");
                });
              }}
            >
              {createJobMutation.isPending ? (
                <ActivityIndicator color="#fff7ef" />
              ) : (
                <Text style={styles.primaryButtonText}>开始转换</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>最近任务</Text>
        {jobsQuery.isLoading ? (
          <ActivityIndicator color="#b65a36" />
        ) : latestJob ? (
          <JobCard
            job={latestJob}
            onPress={() => {
              stackNavigation.navigate("Player", { jobId: latestJob.id });
            }}
            footer={(
              <Text style={styles.helperText}>
                {latestJob.status === "ready"
                  ? "任务已完成，可以直接进入播放页。"
                  : "任务还在处理中，播放页会继续跟踪状态变化。"}
              </Text>
            )}
          />
        ) : (
          <Text style={styles.helperText}>还没有任务，先提交一个 YouTube 链接。</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#211c18",
    borderRadius: 28,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  eyebrow: {
    color: "#f7d8a0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff8f0",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#d8c6b4",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff9f3",
    borderColor: "#d8c9b8",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  cardTitle: {
    color: "#2b2118",
    fontSize: 20,
    fontWeight: "800",
  },
  helperText: {
    color: "#6f6256",
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#f6eee2",
    borderColor: "#dac8b1",
    borderRadius: 18,
    borderWidth: 1,
    color: "#1f1812",
    fontSize: 16,
    minHeight: 108,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#b65a36",
    borderRadius: 18,
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
    alignSelf: "flex-start",
    backgroundColor: "#f1dfc7",
    borderRadius: 16,
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
});
