import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
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
import { useTranslation } from "../i18n";

const PENDING_JOB_KEY = "pending_job_id";

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const submit = useSubmitJob();
  const { data: job } = useJobStatus(jobId);
  const { cacheState, retryCache } = useCacheReadyJob(jobId);
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
    } catch {
      Alert.alert(t("common.error"), t("errors.generic"));
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text);
  };

  const showProgress = ((jobId && job != null) || cacheState === "caching" || cacheState === "cached") && job?.status !== "failed" && job?.status !== "expired";

  return (
    <Screen>
      <View style={styles.formGroup}>
        <View style={styles.fieldHeader}>
          <Ionicons name="link-outline" size={18} color="#8b5c48" />
          <Text style={styles.fieldLabel}>{t("home.pasteUrl")}</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t("home.pasteUrl")}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={() => void handleSubmit()}
            returnKeyType="done"
          />
          <Pressable accessibilityLabel={t("home.paste")} accessibilityRole="button" style={styles.pasteButton} onPress={handlePaste}>
            <Ionicons name="clipboard-outline" size={21} color="#8b5c48" />
          </Pressable>
        </View>
      </View>
      <Pressable accessibilityRole="button" style={[styles.submitButton, (!url.trim() || submit.isPending) && styles.disabled]} onPress={handleSubmit} disabled={!url.trim() || submit.isPending}>
        {submit.isPending ? <ActivityIndicator color="#fff9f3" /> : <><Ionicons name="arrow-down" size={20} color="#fff9f3" /><Text style={styles.submitText}>{t("home.convert")}</Text></>}
      </Pressable>

      {cacheState === "error" && job?.status === "ready" && (
        <StatusCard error title={t("home.cacheFailed")} icon="alert-circle-outline">
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retryCache}><Text style={styles.retryText}>{t("home.retryCache")}</Text></Pressable>
        </StatusCard>
      )}
      {job?.status === "failed" && (
        <StatusCard error title={t("home.conversionFailed")} icon="alert-circle-outline">
          {job.progressPhase ? <Text style={styles.statusText}>{t("home.failedAt", { phase: t(`progress.${job.progressPhase === "downloading" ? "downloading" : job.progressPhase === "transcoding" ? "transcoding" : job.progressPhase === "uploading" ? "saving" : job.progressPhase === "starting" ? "preparing" : "queued"}`) })}</Text> : null}
        </StatusCard>
      )}
      {job?.status === "expired" && <StatusCard error title={t("home.expired")} icon="time-outline" />}

      {showProgress && (() => {
        const { title, detail, activeStep } = getHomeProgressInfo(job ?? { status: "queued", progressPhase: null, attemptCount: 0, lastErrorMessage: null }, cacheState, t);
        return (
          <StatusCard title={title} icon={playableTrack ? "checkmark-circle" : "cloud-download-outline"}>
            <Text style={styles.statusText}>{detail}</Text>
            {playableTrack ? (
              <Pressable accessibilityRole="button" style={styles.playButton} onPress={() => { void playTrack(playableTrack, tracks); navigation.navigate("Player", { jobId: playableTrack.jobId }); }}>
                <Ionicons name="play" size={19} color="#fff9f3" /><Text style={styles.playText}>{t("common.play")}</Text>
              </Pressable>
            ) : null}
            <View style={styles.stepsRow}>
              {PROGRESS_STEPS.map((step, index) => (
                <View key={step} style={styles.stepItem}>
                  <View style={[styles.stepDot, index <= activeStep && styles.stepActive]}>{index < activeStep ? <Ionicons name="checkmark" size={11} color="#fff9f3" /> : null}</View>
                  {index < PROGRESS_STEPS.length - 1 ? <View style={[styles.stepLine, index < activeStep && styles.stepLineActive]} /> : null}
                </View>
              ))}
            </View>
          </StatusCard>
        );
      })()}
    </Screen>
  );
}

function StatusCard({ title, icon, error = false, children }: { title: string; icon: "alert-circle-outline" | "time-outline" | "checkmark-circle" | "cloud-download-outline"; error?: boolean; children?: React.ReactNode }) {
  return <View style={[styles.statusCard, error && styles.errorCard]}><View style={styles.statusHeading}><Ionicons name={icon} size={20} color={error ? "#b42318" : "#8b5c48"} /><Text style={[styles.statusTitle, error && styles.errorTitle]}>{title}</Text></View>{children}</View>;
}

const styles = StyleSheet.create({
  formGroup: { gap: 8 }, fieldHeader: { alignItems: "center", flexDirection: "row", gap: 6 }, fieldLabel: { color: "#6f6256", fontSize: 13, fontWeight: "600" }, inputRow: { flexDirection: "row", gap: 8 }, input: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 12, borderWidth: 1, flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }, pasteButton: { alignItems: "center", backgroundColor: "#eee6dc", borderRadius: 12, height: 48, justifyContent: "center", width: 48 }, submitButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48 }, submitText: { color: "#fff9f3", fontSize: 16, fontWeight: "600" }, disabled: { opacity: 0.5 }, statusCard: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 24, padding: 16 }, errorCard: { backgroundColor: "#fff5f3", borderColor: "#f0c3c1" }, statusHeading: { alignItems: "center", flexDirection: "row", gap: 8 }, statusTitle: { color: "#241a12", flex: 1, fontSize: 17, fontWeight: "700" }, errorTitle: { color: "#b42318" }, statusText: { color: "#6f6256", fontSize: 14, lineHeight: 20 }, retryButton: { alignSelf: "flex-start", paddingVertical: 6 }, retryText: { color: "#8b5c48", fontSize: 15, fontWeight: "600" }, playButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 10, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44 }, playText: { color: "#fff9f3", fontSize: 16, fontWeight: "600" }, stepsRow: { alignItems: "center", flexDirection: "row", marginTop: 4 }, stepItem: { alignItems: "center", flex: 1, flexDirection: "row" }, stepDot: { alignItems: "center", backgroundColor: "#ded0c1", borderRadius: 8, height: 16, justifyContent: "center", width: 16 }, stepActive: { backgroundColor: "#b65a36" }, stepLine: { backgroundColor: "#ded0c1", flex: 1, height: 2 }, stepLineActive: { backgroundColor: "#b65a36" },
});
