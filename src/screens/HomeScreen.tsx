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
import { useAppTheme } from "../app/theme";

const PENDING_JOB_KEY = "pending_job_id";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
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
          <Ionicons name="link-outline" size={18} color={colors.tint} />
          <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{t("home.pasteUrl")}</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.primaryText }]}
            placeholderTextColor={colors.secondaryText}
            placeholder={t("home.pasteUrl")}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={() => void handleSubmit()}
            returnKeyType="done"
          />
          <Pressable accessibilityLabel={t("home.paste")} accessibilityRole="button" style={[styles.pasteButton, { backgroundColor: colors.elevatedSurface }]} onPress={handlePaste}>
            <Ionicons name="clipboard-outline" size={21} color={colors.tint} />
          </Pressable>
        </View>
      </View>
      <Pressable accessibilityRole="button" style={[styles.submitButton, { backgroundColor: colors.tint }, (!url.trim() || submit.isPending) && styles.disabled]} onPress={handleSubmit} disabled={!url.trim() || submit.isPending}>
        {submit.isPending ? <ActivityIndicator color={colors.tintText} /> : <><Ionicons name="arrow-down" size={20} color={colors.tintText} /><Text style={[styles.submitText, { color: colors.tintText }]}>{t("home.convert")}</Text></>}
      </Pressable>

      {cacheState === "error" && job?.status === "ready" && (
        <StatusCard error title={t("home.cacheFailed")} icon="alert-circle-outline">
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retryCache}><Text style={[styles.retryText, { color: colors.tint }]}>{t("home.retryCache")}</Text></Pressable>
        </StatusCard>
      )}
      {job?.status === "failed" && (
        <StatusCard error title={t("home.conversionFailed")} icon="alert-circle-outline">
          {job.progressPhase ? <Text style={[styles.statusText, { color: colors.secondaryText }]}>{t("home.failedAt", { phase: t(`progress.${job.progressPhase === "downloading" ? "downloading" : job.progressPhase === "transcoding" ? "transcoding" : job.progressPhase === "uploading" ? "saving" : job.progressPhase === "starting" ? "preparing" : "queued"}`) })}</Text> : null}
        </StatusCard>
      )}
      {job?.status === "expired" && <StatusCard error title={t("home.expired")} icon="time-outline" />}

      {showProgress && (() => {
        const { title, detail, activeStep } = getHomeProgressInfo(job ?? { status: "queued", progressPhase: null, attemptCount: 0, lastErrorMessage: null }, cacheState, t);
        return (
          <StatusCard title={title} icon={playableTrack ? "checkmark-circle" : "cloud-download-outline"}>
            <Text style={[styles.statusText, { color: colors.secondaryText }]}>{detail}</Text>
            {playableTrack ? (
              <Pressable accessibilityRole="button" style={[styles.playButton, { backgroundColor: colors.tint }]} onPress={() => { void playTrack(playableTrack, tracks); navigation.navigate("Player", { jobId: playableTrack.jobId }); }}>
                <Ionicons name="play" size={19} color={colors.tintText} /><Text style={[styles.playText, { color: colors.tintText }]}>{t("common.play")}</Text>
              </Pressable>
            ) : null}
            <View style={styles.stepsRow}>
              {PROGRESS_STEPS.map((step, index) => (
                <View key={step} style={styles.stepItem}>
                  <View style={[styles.stepDot, { backgroundColor: index <= activeStep ? colors.tint : colors.elevatedSurface }]}>{index < activeStep ? <Ionicons name="checkmark" size={11} color={colors.tintText} /> : null}</View>
                  {index < PROGRESS_STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: index < activeStep ? colors.tint : colors.elevatedSurface }]} /> : null}
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
  const { colors } = useAppTheme();
  return <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }, error && { borderColor: colors.destructive }]}><View style={styles.statusHeading}><Ionicons name={icon} size={20} color={error ? colors.destructive : colors.tint} /><Text style={[styles.statusTitle, { color: error ? colors.destructive : colors.primaryText }]}>{title}</Text></View>{children}</View>;
}

const styles = StyleSheet.create({
  formGroup: { gap: 8 }, fieldHeader: { alignItems: "center", flexDirection: "row", gap: 6 }, fieldLabel: { color: "#6f6256", fontSize: 13, fontWeight: "600" }, inputRow: { flexDirection: "row", gap: 8 }, input: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 12, borderWidth: 1, flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }, pasteButton: { alignItems: "center", backgroundColor: "#eee6dc", borderRadius: 12, height: 48, justifyContent: "center", width: 48 }, submitButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48 }, submitText: { color: "#fff9f3", fontSize: 16, fontWeight: "600" }, disabled: { opacity: 0.5 }, statusCard: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 24, padding: 16 }, errorCard: { backgroundColor: "#fff5f3", borderColor: "#f0c3c1" }, statusHeading: { alignItems: "center", flexDirection: "row", gap: 8 }, statusTitle: { color: "#241a12", flex: 1, fontSize: 17, fontWeight: "700" }, errorTitle: { color: "#b42318" }, statusText: { color: "#6f6256", fontSize: 14, lineHeight: 20 }, retryButton: { alignSelf: "flex-start", paddingVertical: 6 }, retryText: { color: "#8b5c48", fontSize: 15, fontWeight: "600" }, playButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 10, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44 }, playText: { color: "#fff9f3", fontSize: 16, fontWeight: "600" }, stepsRow: { alignItems: "center", flexDirection: "row", marginTop: 4 }, stepItem: { alignItems: "center", flex: 1, flexDirection: "row" }, stepDot: { alignItems: "center", backgroundColor: "#ded0c1", borderRadius: 8, height: 16, justifyContent: "center", width: 16 }, stepActive: { backgroundColor: "#b65a36" }, stepLine: { backgroundColor: "#ded0c1", flex: 1, height: 2 }, stepLineActive: { backgroundColor: "#b65a36" },
});
