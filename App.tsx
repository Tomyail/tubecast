import { StatusBar } from "expo-status-bar";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Settings,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createJob,
  deleteJob,
  fetchJob,
  fetchJobs,
  formatDuration,
  getPlayableAudioUrl,
  getYouTubeTimestampUrl,
  isJobTerminal,
  normalizeBaseUrl,
} from "./src/api";
import type { CreateJobResult, Job, ServerConfig } from "./src/types";

const queryClient = new QueryClient();

const DEFAULT_CONFIG: ServerConfig = {
  baseUrl: "http://192.168.1.100:3000",
  authToken: "",
};

const IOS_SERVER_BASE_URL_KEY = "ytAudio.serverBaseUrl";
const IOS_PLAYBACK_PROGRESS_KEY = "ytAudio.playbackProgress";

function getInitialServerConfig(): ServerConfig {
  if (Platform.OS !== "ios") {
    return DEFAULT_CONFIG;
  }

  const savedBaseUrl = Settings.get(IOS_SERVER_BASE_URL_KEY);
  return {
    ...DEFAULT_CONFIG,
    baseUrl: typeof savedBaseUrl === "string" && savedBaseUrl.trim() ? savedBaseUrl : DEFAULT_CONFIG.baseUrl,
  };
}

function getPlaybackProgressStore(): Record<string, number> {
  if (Platform.OS !== "ios") {
    return {};
  }

  const raw = Settings.get(IOS_PLAYBACK_PROGRESS_KEY);
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setPlaybackProgressStore(store: Record<string, number>) {
  if (Platform.OS !== "ios") {
    return;
  }

  Settings.set({
    [IOS_PLAYBACK_PROGRESS_KEY]: JSON.stringify(store),
  });
}

function getPlaybackProgressKey(job: Job | null | undefined) {
  if (!job) {
    return null;
  }

  return job.sourceKey || job.sourceId || job.sourceUrl || job.id;
}

function readSavedPlaybackPosition(key: string | null) {
  if (!key) {
    return 0;
  }

  const value = getPlaybackProgressStore()[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function writeSavedPlaybackPosition(key: string | null, seconds: number) {
  if (!key) {
    return;
  }

  const store = getPlaybackProgressStore();
  if (seconds <= 0) {
    delete store[key];
  } else {
    store[key] = seconds;
  }

  setPlaybackProgressStore(store);
}

function isMissingNativeSharedObjectError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ERR_NATIVE_SHARED_OBJECT_NOT_FOUND";
}

function safeClearLockScreenControls(player: ReturnType<typeof useAudioPlayer>) {
  try {
    player.clearLockScreenControls();
  } catch (error) {
    if (!isMissingNativeSharedObjectError(error)) {
      throw error;
    }
  }
}

function safeSetActiveForLockScreen(
  player: ReturnType<typeof useAudioPlayer>,
  metadata: Parameters<ReturnType<typeof useAudioPlayer>["setActiveForLockScreen"]>[1],
) {
  try {
    player.setActiveForLockScreen(true, metadata);
  } catch (error) {
    if (!isMissingNativeSharedObjectError(error)) {
      throw error;
    }
  }
}

function AppShell() {
  const initialServerConfig = getInitialServerConfig();
  const [serverConfig, setServerConfig] = useState<ServerConfig>(initialServerConfig);
  const [draftBaseUrl, setDraftBaseUrl] = useState(initialServerConfig.baseUrl);
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

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => deleteJob(serverConfig, jobId),
    onSuccess: async ({ job }) => {
      const previousJobs = jobsQuery.data ?? [];
      const nextJobs = previousJobs.filter((item) => item.id !== job.id);
      writeSavedPlaybackPosition(getPlaybackProgressKey(job), 0);

      queryCache.setQueryData<Job[]>(["jobs", serverConfig], nextJobs);
      queryCache.removeQueries({ queryKey: ["job", serverConfig, job.id] });

      if (effectiveSelectedJobId === job.id) {
        setSelectedJobId(nextJobs[0]?.id ?? null);
      }

      await queryCache.invalidateQueries({ queryKey: ["jobs", serverConfig] });
    },
    onError: (error: unknown) => {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unable to delete job");
    },
  });

  const activeJob = selectedJobQuery.data ?? selectedJobSummary;
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
              const nextConfig = {
                baseUrl: draftBaseUrl,
                authToken: draftToken,
              };

              setServerConfig(nextConfig);

              if (Platform.OS === "ios") {
                Settings.set({
                  [IOS_SERVER_BASE_URL_KEY]: draftBaseUrl,
                });
              }
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
                <QueueJobRow
                  key={job.id}
                  active={job.id === effectiveSelectedJobId}
                  deleteDisabled={deleteJobMutation.isPending}
                  job={job}
                  onDelete={() => {
                    Alert.alert(
                      "Delete job?",
                      "This removes the queue item and its stored audio from the server.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            void deleteJobMutation.mutateAsync(job.id);
                          },
                        },
                      ],
                    );
                  }}
                  onPress={() => setSelectedJobId(job.id)}
                />
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

              <PlaybackCard
                key={getPlaybackProgressKey(activeJob) ?? activeJob.id}
                activeJob={activeJob}
                effectiveSelectedJobId={effectiveSelectedJobId}
                jobs={jobsQuery.data ?? []}
                serverConfig={serverConfig}
                setSelectedJobId={setSelectedJobId}
              />
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

function PlaybackCard({
  activeJob,
  effectiveSelectedJobId,
  jobs,
  serverConfig,
  setSelectedJobId,
}: {
  activeJob: Job;
  effectiveSelectedJobId: string | null;
  jobs: Job[];
  serverConfig: ServerConfig;
  setSelectedJobId: (jobId: string | null) => void;
}) {
  const playableAudioUrl = getPlayableAudioUrl(activeJob, serverConfig);
  const playbackProgressKey = getPlaybackProgressKey(activeJob);
  const player = useAudioPlayer(playableAudioUrl, {
    updateInterval: 500,
    keepAudioSessionActive: true,
  });
  const playerStatus = useAudioPlayerStatus(player);
  const youtubeTimestampUrl = getYouTubeTimestampUrl(activeJob.sourceUrl, playerStatus.currentTime || 0);
  const playbackProgress = playerStatus.duration > 0
    ? Math.min(playerStatus.currentTime / playerStatus.duration, 1)
    : 0;
  const restoredPlaybackKeyRef = useRef<string | null>(null);
  const lastPersistedSecondRef = useRef(-1);
  const pendingAutoPlayJobIdRef = useRef<string | null>(null);
  const handledFinishedJobIdRef = useRef<string | null>(null);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  useEffect(() => {
    if (!playableAudioUrl) {
      player.pause();
    }
  }, [playableAudioUrl, player]);

  useEffect(() => {
    if (activeJob.id !== effectiveSelectedJobId) {
      pendingAutoPlayJobIdRef.current = null;
      return;
    }

    if (activeJob.status === "processing") {
      pendingAutoPlayJobIdRef.current = activeJob.id;
      return;
    }

    if (activeJob.status === "failed") {
      pendingAutoPlayJobIdRef.current = null;
    }
  }, [activeJob, effectiveSelectedJobId]);

  useEffect(() => {
    if (
      activeJob.status !== "ready"
      || pendingAutoPlayJobIdRef.current !== activeJob.id
      || !playableAudioUrl
      || !playerStatus.isLoaded
      || playerStatus.playing
    ) {
      return;
    }

    pendingAutoPlayJobIdRef.current = null;
    player.play();
  }, [activeJob, playableAudioUrl, player, playerStatus.isLoaded, playerStatus.playing]);

  useEffect(() => {
    if (!playerStatus.didJustFinish) {
      handledFinishedJobIdRef.current = null;
      return;
    }

    if (handledFinishedJobIdRef.current === activeJob.id) {
      return;
    }

    handledFinishedJobIdRef.current = activeJob.id;

    const currentIndex = jobs.findIndex((job) => job.id === activeJob.id);
    if (currentIndex < 0) {
      return;
    }

    const nextReadyJob = jobs.slice(currentIndex + 1).find((job) => job.status === "ready");
    if (!nextReadyJob) {
      return;
    }

    pendingAutoPlayJobIdRef.current = nextReadyJob.id;
    setSelectedJobId(nextReadyJob.id);
  }, [activeJob, jobs, playerStatus.didJustFinish, setSelectedJobId]);

  useEffect(() => {
    restoredPlaybackKeyRef.current = null;
    lastPersistedSecondRef.current = -1;
  }, [playbackProgressKey]);

  useEffect(() => {
    if (!playableAudioUrl || !playbackProgressKey || !playerStatus.isLoaded) {
      return;
    }

    if (restoredPlaybackKeyRef.current === playbackProgressKey) {
      return;
    }

    restoredPlaybackKeyRef.current = playbackProgressKey;

    const savedPosition = readSavedPlaybackPosition(playbackProgressKey);
    if (savedPosition <= 0) {
      return;
    }

    if (playerStatus.duration > 0 && savedPosition >= playerStatus.duration - 3) {
      writeSavedPlaybackPosition(playbackProgressKey, 0);
      return;
    }

    void player.seekTo(savedPosition);
  }, [playableAudioUrl, playbackProgressKey, player, playerStatus.duration, playerStatus.isLoaded]);

  useEffect(() => {
    if (!playbackProgressKey || !playerStatus.isLoaded) {
      return;
    }

    if (playerStatus.didJustFinish) {
      writeSavedPlaybackPosition(playbackProgressKey, 0);
      lastPersistedSecondRef.current = -1;
      return;
    }

    const currentSecond = Math.floor(playerStatus.currentTime || 0);
    if (currentSecond === lastPersistedSecondRef.current) {
      return;
    }

    lastPersistedSecondRef.current = currentSecond;
    writeSavedPlaybackPosition(playbackProgressKey, currentSecond);
  }, [
    playbackProgressKey,
    playerStatus.currentTime,
    playerStatus.didJustFinish,
    playerStatus.isLoaded,
  ]);

  useEffect(() => {
    if (!playableAudioUrl) {
      safeClearLockScreenControls(player);
      return;
    }

    safeSetActiveForLockScreen(player, {
      title: activeJob.title || "YT Audio",
      artist: activeJob.channelName || "yt-audio",
      artworkUrl: activeJob.thumbnailUrl || undefined,
    });

    return () => {
      safeClearLockScreenControls(player);
    };
  }, [activeJob, playableAudioUrl, player]);

  const seekToRelativePosition = (ratio: number) => {
    if (!playableAudioUrl || playerStatus.duration <= 0) {
      return;
    }

    const boundedRatio = Math.max(0, Math.min(1, ratio));
    const targetSeconds = boundedRatio * playerStatus.duration;
    writeSavedPlaybackPosition(playbackProgressKey, Math.floor(targetSeconds));
    void player.seekTo(targetSeconds);
  };

  const handleProgressTrackLayout = (event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  };

  const progressPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!playableAudioUrl && playerStatus.duration > 0,
      onMoveShouldSetPanResponder: () => !!playableAudioUrl && playerStatus.duration > 0,
      onPanResponderGrant: (event) => {
        if (progressTrackWidth <= 0) {
          return;
        }

        seekToRelativePosition(event.nativeEvent.locationX / progressTrackWidth);
      },
      onPanResponderMove: (event) => {
        if (progressTrackWidth <= 0) {
          return;
        }

        seekToRelativePosition(event.nativeEvent.locationX / progressTrackWidth);
      },
    }),
  ).current;

  return (
    <View style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerLabel}>Playback</Text>
        <Text style={styles.playerTime}>
          {formatDuration(Math.floor(playerStatus.currentTime || 0))} /{" "}
          {formatDuration(Math.floor(playerStatus.duration || activeJob.durationSeconds || 0))}
        </Text>
      </View>
      <View style={styles.progressStack}>
        <Pressable
          disabled={!playableAudioUrl}
          onLayout={handleProgressTrackLayout}
          onPress={(event) => {
            if (progressTrackWidth <= 0) {
              return;
            }

            seekToRelativePosition(event.nativeEvent.locationX / progressTrackWidth);
          }}
          style={[styles.progressTrack, !playableAudioUrl && styles.buttonDisabled]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${playbackProgress * 100}%` },
            ]}
          />
          <View
            {...progressPanResponder.panHandlers}
            style={[
              styles.progressThumb,
              { left: `${playbackProgress * 100}%` },
            ]}
          />
        </Pressable>
        <Text style={styles.progressHint}>
          {playerStatus.isBuffering
            ? "Buffering audio..."
            : playableAudioUrl
              ? "Ready to play. The bar shows listened progress."
              : "Waiting for the stream to become playable."}
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
            writeSavedPlaybackPosition(playbackProgressKey, 0);
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
        <Pressable
          style={[styles.secondaryButton, !youtubeTimestampUrl && styles.buttonDisabled]}
          disabled={!youtubeTimestampUrl}
          onPress={async () => {
            if (!youtubeTimestampUrl) {
              return;
            }

            player.pause();
            await Linking.openURL(youtubeTimestampUrl);
          }}
        >
          <Text style={styles.secondaryButtonText}>Open on YouTube</Text>
        </Pressable>
      </View>
      <Text style={styles.helperText}>
        {playableAudioUrl
          ? "Audio is ready. Playback uses expo-audio with background mode enabled."
          : "Waiting for the backend to finish processing before playback is available."}
      </Text>
    </View>
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

function QueueJobRow({
  active,
  deleteDisabled,
  job,
  onDelete,
  onPress,
}: {
  active: boolean;
  deleteDisabled: boolean;
  job: Job;
  onDelete: () => void;
  onPress: () => void;
}) {
  const actionWidth = 88;
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);

  const animateTo = (value: number) => {
    offsetRef.current = value;
    Animated.spring(translateX, {
      toValue: value,
      bounciness: 0,
      speed: 18,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        const nextValue = Math.max(-actionWidth, Math.min(0, offsetRef.current + gestureState.dx));
        translateX.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const nextValue = offsetRef.current + gestureState.dx;
        if (nextValue < -actionWidth / 2 || gestureState.vx < -0.35) {
          animateTo(-actionWidth);
          return;
        }

        animateTo(0);
      },
      onPanResponderTerminate: () => {
        animateTo(offsetRef.current);
      },
    }),
  ).current;

  if (Platform.OS !== "ios") {
    return (
      <Pressable
        style={[
          styles.jobRow,
          active && styles.jobRowActive,
        ]}
        onPress={onPress}
      >
        <QueueJobRowContent job={job} />
      </Pressable>
    );
  }

  return (
    <View style={styles.jobRowSwipeShell}>
      <View style={styles.jobDeleteActionWrap}>
        <Pressable
          disabled={deleteDisabled}
          style={[styles.jobDeleteAction, deleteDisabled && styles.buttonDisabled]}
          onPress={() => {
            animateTo(0);
            onDelete();
          }}
        >
          <Text style={styles.jobDeleteActionText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.jobRowAnimated,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Pressable
          style={[
            styles.jobRow,
            active && styles.jobRowActive,
          ]}
          onPress={() => {
            animateTo(0);
            onPress();
          }}
        >
          <QueueJobRowContent job={job} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function QueueJobRowContent({ job }: { job: Job }) {
  return (
    <>
      <View style={styles.jobRowText}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {job.title || job.sourceUrl}
        </Text>
        <Text style={styles.jobMeta} numberOfLines={1}>
          {job.channelName || "Unknown channel"} · {job.status}
        </Text>
      </View>
      <StatusPill status={job.status} />
    </>
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
  jobRowSwipeShell: {
    overflow: "hidden",
    position: "relative",
  },
  jobDeleteActionWrap: {
    alignItems: "stretch",
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: 88,
  },
  jobDeleteAction: {
    alignItems: "center",
    backgroundColor: "#bb3f36",
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
    flex: 1,
    justifyContent: "center",
  },
  jobDeleteActionText: {
    color: "#fff5f2",
    fontSize: 14,
    fontWeight: "800",
  },
  jobRowAnimated: {
    zIndex: 1,
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
  progressStack: {
    gap: 8,
  },
  progressTrack: {
    backgroundColor: "#4b4038",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#f7d8a0",
    borderRadius: 999,
    height: "100%",
    minWidth: 0,
  },
  progressThumb: {
    backgroundColor: "#fff4e0",
    borderColor: "#b65a36",
    borderRadius: 999,
    borderWidth: 2,
    height: 16,
    marginLeft: -8,
    position: "absolute",
    top: -3,
    width: 16,
  },
  progressHint: {
    color: "#d7c6b5",
    fontSize: 12,
    lineHeight: 18,
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
