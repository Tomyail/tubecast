import { useRef } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Directory, File, Paths } from "expo-file-system";
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

  const handleDelete = (track: Track) => {
    Alert.alert(
      "Delete Track",
      `Remove "${track.title || "this track"}" from your library? The audio file will also be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const filename = track.localFilename || decodeURIComponent(track.localPath.split("/").pop() || "");
              if (filename) {
                const file = new File(new Directory(Paths.document, "audio"), filename);
                if (file.exists) file.delete();
              }
            } catch {}
            await deleteTrack(track.id);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Track }) => {
    const isActive = activeTrack?.id === item.id;
    return (
      <SwipeableTrackItem
        track={item}
        isActive={isActive}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onDelete={handleDelete}
      />
    );
  };

  return (
    <Screen scroll={false}>
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

function SwipeableTrackItem({
  track,
  isActive,
  isPlaying,
  onPlay,
  onDelete,
}: {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (t: Track) => void;
  onDelete: (t: Track) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        swipeRef.current?.close();
        onDelete(track);
      }}
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </Pressable>
  );

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        style={[styles.trackItem, isActive && styles.activeTrack]}
        onPress={() => onPlay(track)}
      >
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isActive && styles.activeText]} numberOfLines={1}>
            {track.title || "Untitled"}
          </Text>
          <Text style={styles.trackMeta}>
            {formatDuration(track.durationSeconds)} | {formatFileSize(track.fileSize)}
          </Text>
        </View>
        {isActive && isPlaying && <Text style={styles.playingIcon}>| |</Text>}
      </Pressable>
    </Swipeable>
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
  trackItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, backgroundColor: "#f4ede2" },
  activeTrack: { backgroundColor: "#FFF3EE", paddingHorizontal: 8 },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: "500" },
  trackMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  activeText: { color: "#FF6B35" },
  playingIcon: { fontSize: 14, color: "#FF6B35", fontWeight: "bold" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
  deleteAction: { backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center", width: 80 },
  deleteActionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
