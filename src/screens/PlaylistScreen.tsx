import { useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { Directory, File, Paths } from "expo-file-system";
import Screen from "../components/Screen";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";

export default function PlaylistScreen() {
  const { tracks, deleteTrack, reorderTracks } = usePlaylist();
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Track>) => {
    const isCurrentTrack = activeTrack?.id === item.id;
    return (
      <ScaleDecorator>
        <SwipeableTrackItem
          track={item}
          isActive={isCurrentTrack}
          isPlaying={isPlaying}
          isDragging={isActive}
          onPlay={handlePlay}
          onDelete={handleDelete}
          onDrag={drag}
        />
      </ScaleDecorator>
    );
  };

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>My Music</Text>
      {tracks.length === 0 ? (
        <Text style={styles.empty}>No tracks yet. Convert a YouTube URL to get started.</Text>
      ) : (
        <DraggableFlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderTracks(data)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          containerStyle={{ flex: 1 }}
        />
      )}
    </Screen>
  );
}

function SwipeableTrackItem({
  track,
  isActive,
  isPlaying,
  isDragging,
  onPlay,
  onDelete,
  onDrag,
}: {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  isDragging: boolean;
  onPlay: (t: Track) => void;
  onDelete: (t: Track) => void;
  onDrag: () => void;
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
      <View style={[styles.trackItem, isActive && styles.activeTrack, isDragging && styles.draggingItem]}>
        {/* Drag handle */}
        <Pressable onLongPress={onDrag} style={styles.dragHandle}>
          <Text style={styles.dragHandleIcon}>&#8801;</Text>
        </Pressable>

        <Pressable style={styles.trackContent} onPress={() => onPlay(track)}>
          <Text
            style={[styles.trackTitle, isActive && styles.activeText, track.playCount > 0 && !isActive && styles.playedTitle]}
            numberOfLines={1}
          >
            {track.title || "Untitled"}
          </Text>
          <Text style={styles.trackMeta}>
            {formatDuration(track.durationSeconds)} | {formatFileSize(track.fileSize)}
            {track.playCount > 0 && !isActive && "  · listened"}
          </Text>
        </Pressable>

        {isActive && isPlaying ? (
          <Text style={styles.playingIcon}>| |</Text>
        ) : !isActive && track.playCount === 0 ? (
          <View style={styles.unplayedDot} />
        ) : null}
      </View>
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
  draggingItem: { backgroundColor: "#f0e6d8", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  dragHandle: { paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 },
  dragHandleIcon: { fontSize: 18, color: "#bbb" },
  trackContent: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: "500" },
  trackMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  activeText: { color: "#FF6B35" },
  playedTitle: { color: "#aaa" },
  playingIcon: { fontSize: 14, color: "#FF6B35", fontWeight: "bold" },
  unplayedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF6B35", marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
  deleteAction: { backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center", width: 80 },
  deleteActionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
