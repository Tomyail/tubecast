import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createJob,
  fetchJob,
  fetchJobs,
  formatDuration,
  getPlayableAudioUrl,
  isJobTerminal,
  normalizeBaseUrl,
} from "./src/api";
import type { CreateJobResult, Job, ServerConfig } from "./src/types";

const queryClient = new QueryClient();

const DEFAULT_CONFIG: ServerConfig = {
  baseUrl: "http://192.168.1.100:3000",
  authToken: "",
};

function AppShell() {
  const [serverConfig, setServerConfig] = useState<ServerConfig>(DEFAULT_CONFIG);
  const [draftBaseUrl, setDraftBaseUrl] = useState(DEFAULT_CONFIG.baseUrl);
  const [draftToken, setDraftToken] = useState(DEFAULT_CONFIG.authToken);
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const normalizedBaseUrl = useMemo(() => normalizeBaseUrl(serverConfig.baseUrl), [serverConfig.baseUrl]);
  const hasServerConfig = normalizedBaseUrl.length > 0;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  const queryCache = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["jobs", serverConfig],
    queryFn: () => fetchJobs(serverConfig),
    enabled: hasServerConfig,
    refetchInterval: 5000,
  });

  const selectedJobSummary = jobsQuery.data?.find((job) => job.id === selectedJobId) ?? null;
  const effectiveSelectedJobId = selectedJobId ?? jobsQuery.data?.[0]?.id ?? null;

  useEffect(() => {
    if (!selectedJobId && jobsQuery.data?.[0]?.id) {
      setSelectedJobId(jobsQuery.data[0].id);
    }
  }, [jobsQuery.data, selectedJobId]);

  const selectedJobQuery = useQuery({
    queryKey: ["job", serverConfig, effectiveSelectedJobId],
    queryFn: () => fetchJob(serverConfig, effectiveSelectedJobId as string),
    enabled: hasServerConfig && !!effectiveSelectedJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && isJobTerminal(job.status) ? false : 2000;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async () => createJob(serverConfig, {
      sourceUrl,
      idempotencyKey: `mobile-${Date.now()}`,
    }),
    onSuccess: async (result: CreateJobResult) => {
      setSelectedJobId(result.job.id);
      setSourceUrl("");
      await queryCache.invalidateQueries({ queryKey: ["jobs", serverConfig] });
      await queryCache.invalidateQueries({ queryKey: ["job", serverConfig, result.job.id] });
    },
    onError: (error: unknown) => {
      Alert.alert("Request failed", error instanceof Error ? error.message : "Unable to create job");
    },
  });

  const activeJob = selectedJobQuery.data ?? selectedJobSummary;
  const playableAudioUrl = getPlayableAudioUrl(activeJob, serverConfig);
  const player = useAudioPlayer(playableAudioUrl, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!activeJob?.audioUrl) {
      player.pause();
    }
  }, [activeJob?.audioUrl, player]);

  useEffect(() => {
    if (!playableAudioUrl || !activeJob) {
      player.clearLockScreenControls();
      return;
    }

    player.setActiveForLockScreen(true, {
      title: activeJob.title || "YT Audio",
      artist: activeJob.channelName || "yt-audio",
      artworkUrl: activeJob.thumbnailUrl || undefined,
    });

    return () => {
      player.clearLockScreenControls();
    };
  }, [activeJob, playableAudioUrl, player]);

  const submitDisabled = createJobMutation.isPending || !sourceUrl.trim() || !hasServerConfig;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YT Audio</Text>
          <Text style={styles.title}>Mobile client MVP</Text>
          <Text style={styles.subtitle}>
            Submit a YouTube link, watch the backend process it, then stream the audio from one shared app.
          </Text>
        </View>

        <Card
          title="Server"
          description="Point the app at your backend. Use your LAN IP on a real device, not localhost."
        >
          <LabeledField label="Base URL">
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.100:3000"
              placeholderTextColor="#8b8478"
              style={styles.input}
              value={draftBaseUrl}
              onChangeText={setDraftBaseUrl}
            />
          </LabeledField>
          <LabeledField label="Bearer token">
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Optional AUTH_TOKEN"
              placeholderTextColor="#8b8478"
              style={styles.input}
              value={draftToken}
              onChangeText={setDraftToken}
            />
          </LabeledField>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setServerConfig({
                baseUrl: draftBaseUrl,
                authToken: draftToken,
              });
            }}
          >
            <Text style={styles.secondaryButtonText}>Apply server config</Text>
          </Pressable>
          <Text style={styles.helperText}>
            Active server: {hasServerConfig ? normalizedBaseUrl : "Not configured"}
          </Text>
        </Card>

        <Card
          title="Submit"
          description="The app sends one URL to the backend and lets the queue handle download and conversion."
        >
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#8b8478"
            style={[styles.input, styles.multilineInput]}
            value={sourceUrl}
            onChangeText={setSourceUrl}
          />
          <Pressable
            style={[styles.primaryButton, submitDisabled && styles.buttonDisabled]}
            disabled={submitDisabled}
            onPress={() => {
              void createJobMutation.mutateAsync();
            }}
          >
            {createJobMutation.isPending ? (
              <ActivityIndicator color="#fff7ef" />
            ) : (
              <Text style={styles.primaryButtonText}>Create job</Text>
            )}
          </Pressable>
          <Text style={styles.helperText}>
            API behavior: duplicate YouTube URLs reuse existing jobs; repeated idempotency keys are safe retries.
          </Text>
        </Card>

        <Card
          title="Queue"
          description="Recent jobs refresh automatically. Tap any job to inspect details or play when ready."
        >
          {jobsQuery.isLoading ? (
            <LoadingRow label="Loading jobs..." />
          ) : jobsQuery.isError ? (
            <ErrorText error={jobsQuery.error} />
          ) : jobsQuery.data?.length ? (
            <View style={styles.jobList}>
              {jobsQuery.data.map((job) => (
                <Pressable
                  key={job.id}
                  style={[
                    styles.jobRow,
                    job.id === effectiveSelectedJobId && styles.jobRowActive,
                  ]}
                  onPress={() => setSelectedJobId(job.id)}
                >
                  <View style={styles.jobRowText}>
                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {job.title || job.sourceUrl}
                    </Text>
                    <Text style={styles.jobMeta} numberOfLines={1}>
                      {job.channelName || "Unknown channel"} · {job.status}
                    </Text>
                  </View>
                  <StatusPill status={job.status} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No jobs yet.</Text>
          )}
        </Card>

        <Card
          title="Detail"
          description="The selected job polls faster until it becomes ready, then hands its media URL to the local player."
        >
          {selectedJobQuery.isLoading && !activeJob ? (
            <LoadingRow label="Loading job..." />
          ) : selectedJobQuery.isError ? (
            <ErrorText error={selectedJobQuery.error} />
          ) : activeJob ? (
            <View style={styles.detailStack}>
              <View style={styles.metaGrid}>
                <DetailItem label="Status" value={activeJob.status} />
                <DetailItem label="Duration" value={formatDuration(activeJob.durationSeconds)} />
                <DetailItem label="Source ID" value={activeJob.sourceId || "Pending"} />
                <DetailItem label="Created" value={new Date(activeJob.createdAt).toLocaleString()} />
              </View>

              <Text style={styles.detailTitle}>{activeJob.title || "Untitled job"}</Text>
              <Text style={styles.detailSubtitle}>{activeJob.channelName || activeJob.sourceUrl}</Text>

              {activeJob.errorMessage ? (
                <Text style={styles.errorText}>{activeJob.errorMessage}</Text>
              ) : null}

              <View style={styles.playerCard}>
                <View style={styles.playerHeader}>
                  <Text style={styles.playerLabel}>Playback</Text>
                  <Text style={styles.playerTime}>
                    {formatDuration(Math.floor(playerStatus.currentTime || 0))} /{" "}
                    {formatDuration(Math.floor(playerStatus.duration || activeJob.durationSeconds || 0))}
                  </Text>
                </View>
                <View style={styles.playerActions}>
                  <Pressable
                    style={[styles.secondaryButton, !playableAudioUrl && styles.buttonDisabled]}
                    disabled={!playableAudioUrl}
                    onPress={() => {
                      if (playerStatus.playing) {
                        player.pause();
                        return;
                      }

                      player.play();
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {playerStatus.playing ? "Pause" : "Play"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, !playableAudioUrl && styles.buttonDisabled]}
                    disabled={!playableAudioUrl}
                    onPress={() => {
                      void player.seekTo(0);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Restart</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, !playableAudioUrl && styles.buttonDisabled]}
                    disabled={!playableAudioUrl}
                    onPress={() => {
                      if (!playableAudioUrl) {
                        return;
                      }

                      void Linking.openURL(playableAudioUrl);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Open media URL</Text>
                  </Pressable>
                </View>
                <Text style={styles.helperText}>
                  {playableAudioUrl
                    ? "Audio is ready. Playback uses expo-audio with background mode enabled."
                    : "Waiting for the backend to finish processing before playback is available."}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Select a job to inspect it.</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      {children}
    </View>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color="#b65a36" />
      <Text style={styles.helperText}>{label}</Text>
    </View>
  );
}

function ErrorText({ error }: { error: unknown }) {
  return (
    <Text style={styles.errorText}>
      {error instanceof Error ? error.message : "Something went wrong"}
    </Text>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: Job["status"] }) {
  return (
    <View
      style={[
        styles.statusPill,
        status === "ready" && styles.statusReady,
        status === "failed" && styles.statusFailed,
        status === "processing" && styles.statusProcessing,
      ]}
    >
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4ede2",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 16,
  },
  hero: {
    backgroundColor: "#211c18",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  eyebrow: {
    color: "#f7d8a0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff8f0",
    fontSize: 31,
    fontWeight: "800",
    marginBottom: 8,
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
    shadowColor: "#6d5745",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    color: "#2b2118",
    fontSize: 20,
    fontWeight: "800",
  },
  cardDescription: {
    color: "#6f6256",
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: "#5f4c3f",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f6eee2",
    borderColor: "#dac8b1",
    borderRadius: 18,
    borderWidth: 1,
    color: "#1f1812",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 98,
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
  helperText: {
    color: "#6f6256",
    fontSize: 13,
    lineHeight: 19,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  errorText: {
    color: "#b23f3f",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: "#6f6256",
    fontSize: 14,
  },
  jobList: {
    gap: 10,
  },
  jobRow: {
    alignItems: "center",
    backgroundColor: "#f7efe5",
    borderColor: "#e2d2c0",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  jobRowActive: {
    borderColor: "#b65a36",
    backgroundColor: "#fff0e8",
  },
  jobRowText: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    color: "#241a12",
    fontSize: 15,
    fontWeight: "700",
  },
  jobMeta: {
    color: "#776758",
    fontSize: 13,
  },
  statusPill: {
    backgroundColor: "#e6dbd0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusProcessing: {
    backgroundColor: "#f6d59f",
  },
  statusReady: {
    backgroundColor: "#bde1c0",
  },
  statusFailed: {
    backgroundColor: "#f0c3c1",
  },
  statusText: {
    color: "#3f3026",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailStack: {
    gap: 14,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailItem: {
    backgroundColor: "#f7efe3",
    borderRadius: 16,
    minWidth: "47%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLabel: {
    color: "#7d6d5e",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#201911",
    fontSize: 14,
    fontWeight: "700",
  },
  detailTitle: {
    color: "#241a12",
    fontSize: 22,
    fontWeight: "800",
  },
  detailSubtitle: {
    color: "#706353",
    fontSize: 14,
    lineHeight: 20,
  },
  playerCard: {
    backgroundColor: "#211c18",
    borderRadius: 22,
    gap: 14,
    padding: 16,
  },
  playerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playerLabel: {
    color: "#f7d8a0",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  playerTime: {
    color: "#efe2d4",
    fontSize: 14,
    fontWeight: "700",
  },
  playerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
