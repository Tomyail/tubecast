import { useRef, useState, useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { Directory, File, Paths } from "expo-file-system";
import Screen from "../components/Screen";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";

export default function PlaylistScreen() {
  const { tracks, deleteTrack, deleteTracks, reorderTracks } = usePlaylist();
  const { playTrack, activeTrack, isPlaying, stopPlayback } = usePlayer();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = tracks.length > 0 && selectedIds.size === tracks.length;

  const enterEditMode = () => {
    setIsEditMode(true);
    setSelectedIds(new Set());
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(tracks.map((t) => t.id)));
  };

  const deleteCachedFile = (track: Track) => {
    const filename =
      track.localFilename ||
      (track.localPath ? decodeURIComponent(track.localPath.split("/").pop() || "") : "");
    if (!filename) return;
    const file = new File(new Directory(Paths.document, "audio"), filename);
    if (file.exists) file.delete();
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    Alert.alert(
      `删除 ${count} 首？`,
      `将删除 ${count} 个音频文件，无法恢复。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            if (activeTrack && selectedIds.has(activeTrack.id)) {
              stopPlayback();
            }
            for (const id of ids) {
              const track = tracks.find((t) => t.id === id);
              if (track) {
                try {
                  deleteCachedFile(track);
                } catch {}
              }
            }
            await deleteTracks(ids);
            exitEditMode();
          },
        },
      ]
    );
  };

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
              deleteCachedFile(track);
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
          isEditMode={isEditMode}
          isSelected={selectedIds.has(item.id)}
          onPlay={handlePlay}
          onDelete={handleDelete}
          onDrag={drag}
          onToggleSelect={toggleSelect}
        />
      </ScaleDecorator>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        {isEditMode ? (
          <>
            <Pressable onPress={toggleSelectAll}>
              <Text style={styles.headerAction}>{allSelected ? "取消全选" : "全选"}</Text>
            </Pressable>
            <Text style={styles.title}>
              {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : "选择曲目"}
            </Text>
            <Pressable onPress={exitEditMode}>
              <Text style={styles.headerAction}>完成</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>My Music</Text>
            {tracks.length > 0 && (
              <Pressable onPress={enterEditMode}>
                <Text style={styles.headerAction}>编辑</Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      {tracks.length === 0 ? (
        <Text style={styles.empty}>No tracks yet. Convert a YouTube URL to get started.</Text>
      ) : (
        <DraggableFlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          onDragEnd={isEditMode ? () => {} : ({ data }) => reorderTracks(data)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          containerStyle={{ flex: 1 }}
        />
      )}

      {isEditMode && (
        <View style={styles.actionBar}>
          <Pressable style={styles.actionBarCancel} onPress={exitEditMode}>
            <Text style={styles.actionBarCancelText}>取消</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBarDelete,
              selectedIds.size === 0 && styles.actionBarDeleteDisabled,
            ]}
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.actionBarDeleteText}>
              {selectedIds.size > 0 ? `删除 (${selectedIds.size} 项)` : "删除"}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function SwipeableTrackItem({
  track,
  isActive,
  isPlaying,
  isDragging,
  isEditMode,
  isSelected,
  onPlay,
  onDelete,
  onDrag,
  onToggleSelect,
}: {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  isDragging: boolean;
  isEditMode: boolean;
  isSelected: boolean;
  onPlay: (t: Track) => void;
  onDelete: (t: Track) => void;
  onDrag: () => void;
  onToggleSelect: (id: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const rowContent = (
    <Pressable
      style={[
        styles.trackItem,
        isActive && !isEditMode && styles.activeTrack,
        isDragging && styles.draggingItem,
        isSelected && styles.selectedTrack,
      ]}
      onPress={() => (isEditMode ? onToggleSelect(track.id) : onPlay(track))}
    >
      {isEditMode ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <View style={styles.checkboxInner} />}
        </View>
      ) : (
        <Pressable onLongPress={onDrag} style={styles.dragHandle}>
          <Text style={styles.dragHandleIcon}>&#8801;</Text>
        </Pressable>
      )}

      <View style={styles.trackContent}>
        <Text
          style={[
            styles.trackTitle,
            isActive && !isEditMode && styles.activeText,
            track.playCount > 0 && !isActive && styles.playedTitle,
          ]}
          numberOfLines={1}
        >
          {track.title || "Untitled"}
        </Text>
        <Text style={styles.trackMeta}>
          {formatDuration(track.durationSeconds)} | {formatFileSize(track.fileSize)}
          {track.playCount > 0 && !isActive && "  · listened"}
        </Text>
      </View>

      {!isEditMode && (
        isActive && isPlaying ? (
          <Text style={styles.playingIcon}>| |</Text>
        ) : !isActive && track.playCount === 0 ? (
          <View style={styles.unplayedDot} />
        ) : null
      )}
    </Pressable>
  );

  if (isEditMode) {
    return rowContent;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            swipeRef.current?.close();
            onDelete(track);
          }}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      {rowContent}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "bold" },
  headerAction: { fontSize: 16, color: "#b65a36", fontWeight: "600" },
  empty: { color: "#999", fontSize: 16, textAlign: "center", marginTop: 40 },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: "#f4ede2",
  },
  activeTrack: { backgroundColor: "#FFF3EE", paddingHorizontal: 8 },
  selectedTrack: { backgroundColor: "#FEF0E8" },
  draggingItem: {
    backgroundColor: "#f0e6d8",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dragHandle: { paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 },
  dragHandleIcon: { fontSize: 18, color: "#bbb" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#b65a36",
    marginRight: 12,
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#fff" },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#b65a36",
  },
  trackContent: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: "500" },
  trackMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  activeText: { color: "#FF6B35" },
  playedTitle: { color: "#aaa" },
  playingIcon: { fontSize: 14, color: "#FF6B35", fontWeight: "bold" },
  unplayedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginLeft: 8,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
  deleteAction: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  deleteActionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#fff9f3",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#dbcbb9",
  },
  actionBarCancel: { paddingHorizontal: 8, paddingVertical: 8 },
  actionBarCancelText: { fontSize: 16, color: "#6f6256", fontWeight: "600" },
  actionBarDelete: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBarDeleteDisabled: { opacity: 0.4 },
  actionBarDeleteText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
