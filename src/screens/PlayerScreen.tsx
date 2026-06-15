import { useCallback, useState } from "react";
import { Linking, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useCacheReadyJob } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";

export default function PlayerScreen() {
  const {
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSource,
    playbackError,
    togglePlayback,
    seekTo,
    playNext,
    playPrevious,
  } = usePlayer();
  const { cacheState, retryCache } = useCacheReadyJob(activeTrack?.jobId ?? null);
  const [progressWidth, setProgressWidth] = useState(1);

  const seekFromX = useCallback((x: number) => {
    if (duration <= 0) return;
    const pct = Math.min(1, Math.max(0, x / progressWidth));
    seekTo(pct * duration);
  }, [duration, progressWidth, seekTo]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => seekFromX(e.nativeEvent.locationX),
    onPanResponderMove: (e) => seekFromX(e.nativeEvent.locationX),
  });

  if (!activeTrack) {
    return (
      <Screen>
        <Text style={styles.empty}>No track playing</Text>
      </Screen>
    );
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  const sourceLabel =
    cacheState === "caching" ? "缓存中" :
    activeTrack.cacheStatus === "cached" || playbackSource === "local" ? "已缓存" :
    cacheState === "error" || activeTrack.cacheStatus === "failed" ? "缓存失败" :
    playbackSource === "remote" ? "在线播放" :
    "未缓存";

  return (
    <Screen>
      <View style={styles.container}>
        <Pressable onPress={() => {
          if (isPlaying) void togglePlayback();
          const t = Math.floor(currentTime);
          const url = `${activeTrack.sourceUrl}${activeTrack.sourceUrl.includes("?") ? "&" : "?"}t=${t}`;
          Linking.openURL(url);
        }}>
          <Text style={styles.title} numberOfLines={2}>{activeTrack.title}</Text>
        </Pressable>
        <Text style={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        <Text style={styles.sourceStatus}>{sourceLabel}</Text>
        {playbackError && <Text style={styles.errorText}>{playbackError}</Text>}
        {cacheState === "error" && (
          <Pressable style={styles.retryCacheButton} onPress={retryCache}>
            <Text style={styles.retryCacheText}>重试缓存</Text>
          </Pressable>
        )}

        {/* Progress bar */}
        <View
          style={styles.progressWrap}
          onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={playPrevious} style={styles.controlBtn}>
            <Text style={styles.controlText}>|&lt;</Text>
          </Pressable>
          <Pressable onPress={() => { void togglePlayback(); }} style={styles.playBtn}>
            <Text style={styles.playText}>{isPlaying ? "||" : ">"}</Text>
          </Pressable>
          <Pressable onPress={playNext} style={styles.controlBtn}>
            <Text style={styles.controlText}>|&gt;</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  empty: { fontSize: 18, color: "#999", textAlign: "center", marginTop: 100 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  time: { fontSize: 16, color: "#666", marginBottom: 16 },
  sourceStatus: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 8 },
  errorText: { fontSize: 14, color: "red", textAlign: "center", marginBottom: 8 },
  retryCacheButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#eee", marginBottom: 8 },
  retryCacheText: { color: "#666", fontSize: 13, fontWeight: "600" },
  progressWrap: { width: "100%", height: 32, justifyContent: "center" },
  progressBg: { width: "100%", height: 4, backgroundColor: "#eee", borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, backgroundColor: "#FF6B35", borderRadius: 2 },
  controls: { flexDirection: "row", alignItems: "center", gap: 32, marginTop: 32 },
  controlBtn: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
  controlText: { fontSize: 28, color: "#555" },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FF6B35", justifyContent: "center", alignItems: "center" },
  playText: { fontSize: 32, color: "#fff", fontWeight: "bold" },
});
