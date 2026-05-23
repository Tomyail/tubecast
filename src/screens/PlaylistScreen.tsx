import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";

export default function PlaylistScreen() {
  const { tracks, deleteTrack } = usePlaylist();
  const { playTrack, activeTrack, isPlaying } = usePlayer();

  const handlePlay = (track: Track) => {
    playTrack(track, tracks);
  };

  const renderItem = ({ item }: { item: Track }) => {
    const isActive = activeTrack?.id === item.id;
    return (
      <Pressable
        style={[styles.trackItem, isActive && styles.activeTrack]}
        onPress={() => handlePlay(item)}
        onLongPress={() => deleteTrack(item.id)}
      >
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isActive && styles.activeText]} numberOfLines={1}>
            {item.title || "Untitled"}
          </Text>
          <Text style={styles.trackMeta}>
            {formatDuration(item.durationSeconds)} | {formatFileSize(item.fileSize)}
          </Text>
        </View>
        {isActive && isPlaying && <Text style={styles.playingIcon}>| |</Text>}
      </Pressable>
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>My Music</Text>
      {tracks.length === 0 ? (
        <Text style={styles.empty}>No tracks yet. Convert a YouTube URL to get started.</Text>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Screen>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  empty: { color: "#999", fontSize: 16, textAlign: "center", marginTop: 40 },
  trackItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  activeTrack: { backgroundColor: "#FFF3EE", borderRadius: 8, paddingHorizontal: 8 },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: "500" },
  trackMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  activeText: { color: "#FF6B35" },
  playingIcon: { fontSize: 14, color: "#FF6B35", fontWeight: "bold" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
});
