import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useSubmitJob, useDownloadReadyJob, useJobStatus } from "../features/jobs/hooks";

const PENDING_JOB_KEY = "pending_job_id";

export default function HomeScreen() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const submit = useSubmitJob();
  const { data: job } = useJobStatus(jobId);
  const { downloadState, downloadError, retry } = useDownloadReadyJob(jobId);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_JOB_KEY).then((id) => {
      if (id) setJobId(id);
    });
  }, []);

  useEffect(() => {
    if (downloadState === "done" || job?.status === "failed" || job?.status === "expired") {
      AsyncStorage.removeItem(PENDING_JOB_KEY);
    }
  }, [downloadState, job?.status]);

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

      {downloadState === "idle" && jobId && (
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Converting...</Text>
        </View>
      )}

      {downloadState === "downloading" && (
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Downloading audio...</Text>
        </View>
      )}

      {downloadState === "done" && (
        <View style={styles.statusBox}>
          <Text style={styles.readyText}>Done! Added to your playlist.</Text>
        </View>
      )}

      {downloadState === "error" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>Download failed: {downloadError}</Text>
          <Pressable style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {job?.status === "failed" && downloadState === "idle" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>Conversion failed: {job.errorMessage ?? "Unknown error"}</Text>
        </View>
      )}

      {job?.status === "expired" && downloadState === "idle" && (
        <View style={styles.statusBox}>
          <Text style={styles.errorText}>Audio has expired. Please submit the URL again.</Text>
        </View>
      )}
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
  readyText: { fontSize: 16, color: "green", fontWeight: "600", textAlign: "center" },
  errorText: { fontSize: 16, color: "red", textAlign: "center" },
  retryButton: { backgroundColor: "#FF6B35", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
