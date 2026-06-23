import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import Screen from "../components/Screen";
import { useSubmitJob, useCacheReadyJob, useJobStatus } from "../features/jobs/hooks";
import { getHomeProgressInfo, PROGRESS_STEPS } from "../features/jobs/progress";
import { trackFromReadyJob } from "../features/jobs/track";
import { usePlayer } from "../features/player/context";
import { usePlaylist } from "../features/playlist/context";

const PENDING_JOB_KEY = "pending_job_id";

const PHASE_LABELS: Record<string, string> = {
  downloading: "下载",
  transcoding: "转码",
  uploading: "保存",
  starting: "准备",
  queued: "排队",
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const submit = useSubmitJob();
  const { data: job } = useJobStatus(jobId);
  const { cacheState, cacheError, retryCache } = useCacheReadyJob(jobId);
  const { tracks } = usePlaylist();
  const { playTrack } = usePlayer();
  const playableTrack =
    (jobId ? tracks.find((track) => track.jobId === jobId) : null) ??
    (job?.status === "ready" ? trackFromReadyJob(job) : null);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_JOB_KEY).then((id) => {
      if (id) setJobId(id);
    });
  }, []);

  useEffect(() => {
    if (job?.status === "ready" || job?.status === "failed" || job?.status === "expired") {
      AsyncStorage.removeItem(PENDING_JOB_KEY);
    }
  }, [job?.status]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    try {
      const result = await submit.mutateAsync(url.trim());
      await AsyncStorage.setItem(PENDING_JOB_KEY, result.id);
      setJobId(result.id);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text);
  };

  return (
    <Screen>
      <Text style={styles.title}>Convert Audio</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Paste YouTube URL"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable style={styles.pasteButton} onPress={handlePaste}>
          <Text style={styles.pasteText}>Paste</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.submitButton, (!url.trim() || submit.isPending) && styles.disabled]}
        onPress={handleSubmit}
        disabled={!url.trim() || submit.isPending}
      >
        {submit.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Convert</Text>
        )}
      </Pressable>

      {cacheState === "error" && job?.status === "ready" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>缓存失败：{cacheError}</Text>
          <Pressable style={styles.retryButton} onPress={retryCache}>
            <Text style={styles.retryText}>重试缓存</Text>
          </Pressable>
        </View>
      )}

      {job?.status === "failed" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>转换失败</Text>
          {job.progressPhase != null && job.progressPhase !== "" && PHASE_LABELS[job.progressPhase] && (
            <Text style={styles.statusText}>{`失败发生在${PHASE_LABELS[job.progressPhase]}阶段`}</Text>
          )}
        </View>
      )}

      {job?.status === "expired" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>Audio has expired. Please submit the URL again.</Text>
        </View>
      )}

      {((jobId && job != null) || cacheState === "caching" || cacheState === "cached") && job?.status !== "failed" && job?.status !== "expired" && (() => {
        const { title, detail, activeStep } = getHomeProgressInfo(
          job ?? { status: "queued", progressPhase: null, attemptCount: 0, lastErrorMessage: null },
          cacheState,
        );
        return (
          <View style={styles.statusBox}>
            <Text style={styles.progressTitle}>{title}</Text>
            <Text style={styles.progressDetail}>{detail}</Text>
            {playableTrack && (
              <Pressable
                style={styles.playButton}
                onPress={() => {
                  void playTrack(playableTrack, tracks);
                  navigation.navigate("Player", { jobId: playableTrack.jobId });
                }}
              >
                <Text style={styles.playText}>Play</Text>
              </Pressable>
            )}
            <View style={styles.stepsRow}>
              {PROGRESS_STEPS.map((step, i) => (
                <View key={step} style={[styles.stepItem, i <= activeStep && styles.stepActive]}>
                  <Text style={[styles.stepText, i <= activeStep && styles.stepTextActive]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  pasteButton: { backgroundColor: "#eee", paddingHorizontal: 16, justifyContent: "center", borderRadius: 8 },
  pasteText: { fontSize: 14, color: "#555" },
  submitButton: { backgroundColor: "#FF6B35", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  statusBox: { marginTop: 24, alignItems: "center", gap: 12 },
  statusText: { fontSize: 16, color: "#666" },
  errorText: { fontSize: 16, color: "red", textAlign: "center" },
  retryButton: { backgroundColor: "#FF6B35", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  playButton: { backgroundColor: "#4CAF50", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  playText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  progressTitle: { fontSize: 18, fontWeight: "bold" },
  progressDetail: { fontSize: 14, color: "#888" },
  stepsRow: { flexDirection: "row", gap: 4, marginTop: 12 },
  stepItem: { flex: 1, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 4, alignItems: "center" },
  stepActive: { backgroundColor: "#FF6B35" },
  stepText: { fontSize: 11, color: "#999" },
  stepTextActive: { color: "#fff", fontWeight: "600" },
});
