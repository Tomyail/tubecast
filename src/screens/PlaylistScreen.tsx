import { useRef, useState, useCallback, useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { Directory, File, Paths } from "expo-file-system";
import Screen from "../components/Screen";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";
import { useTranslation } from "../i18n";
import { formatDuration, formatFileSize } from "../i18n/formatters";

type PlaylistStackParamList = { PlaylistRoot: undefined };
const MINI_PLAYER_HEIGHT = 64;

export default function PlaylistScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<PlaylistStackParamList>>();
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
      t("playlist.deleteTracksTitle"),
      t("playlist.deleteTracksMessage", { count }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
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
      t("playlist.deleteTrackTitle"),
      t("playlist.deleteTrackMessage", { title: track.title || t("common.untitled") }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLargeTitle: false,
      title: isEditMode
        ? selectedIds.size > 0
          ? t("playlist.selected", { count: selectedIds.size })
          : t("playlist.selectTracks")
        : t("playlist.title"),
      headerLeft: isEditMode
        ? () => (
            <Pressable onPress={toggleSelectAll} style={styles.navigationAction}>
              <Text style={styles.headerAction}>{allSelected ? t("playlist.clearAll") : t("playlist.selectAll")}</Text>
            </Pressable>
          )
        : undefined,
      headerRight: isEditMode
        ? () => (
            <Pressable onPress={exitEditMode} style={styles.navigationAction}>
              <Text style={styles.headerAction}>{t("common.done")}</Text>
            </Pressable>
          )
        : tracks.length > 0
          ? () => (
              <Pressable onPress={enterEditMode} style={styles.navigationAction}>
                <Text style={styles.headerAction}>{t("playlist.edit")}</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [allSelected, isEditMode, navigation, selectedIds.size, t, tracks.length]);

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
          t={t}
          locale={i18n.language}
        />
      </ScaleDecorator>
    );
  };

  return (
    <Screen scroll={false}>
      {tracks.length === 0 ? (
        <Text style={styles.empty}>{t("playlist.empty")}</Text>
      ) : (
        <DraggableFlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          onDragEnd={isEditMode ? () => {} : ({ data }) => reorderTracks(data)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: isEditMode ? 84 + (activeTrack ? MINI_PLAYER_HEIGHT : 0) : activeTrack ? MINI_PLAYER_HEIGHT : 0 }}
        />
      )}

      {isEditMode && (
        <View style={[styles.actionBar, activeTrack && styles.actionBarWithPlayer]}>
          <Pressable style={styles.actionBarCancel} onPress={exitEditMode}>
            <Text style={styles.actionBarCancelText}>{t("common.cancel")}</Text>
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
              {selectedIds.size > 0 ? t("playlist.deleteSelected", { count: selectedIds.size }) : t("common.delete")}
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
  t,
  locale,
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
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
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
          {isSelected && <Ionicons name="checkmark" size={15} color="#fff9f3" />}
        </View>
      ) : (
        <Pressable accessibilityLabel="Reorder track" accessibilityRole="button" onLongPress={onDrag} style={styles.dragHandle}>
          <Ionicons name="reorder-three-outline" size={22} color="#9a8d81" />
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
          {track.title || t("common.untitled")}
        </Text>
        <Text style={styles.trackMeta}>
          {formatDuration(track.durationSeconds)} | {formatFileSize(track.fileSize, locale)}
          {track.playCount > 0 && !isActive && ` · ${t("playlist.listened")}`}
        </Text>
      </View>

      {!isEditMode && (
        isActive && isPlaying ? (
          <Ionicons name="volume-high" size={19} color="#b65a36" />
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
          <Text style={styles.deleteActionText}>{t("common.delete")}</Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      {rowContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  headerAction: { fontSize: 16, color: "#b65a36", fontWeight: "600" },
  navigationAction: { paddingHorizontal: 4, paddingVertical: 8 },
  empty: { color: "#6f6256", fontSize: 16, textAlign: "center", marginTop: 40 },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f4ede2",
  },
  activeTrack: { backgroundColor: "#fff3ee" },
  selectedTrack: { backgroundColor: "#f8e9df" },
  draggingItem: {
    backgroundColor: "#f0e6d8",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dragHandle: { alignItems: "center", height: 44, justifyContent: "center", marginRight: 4, width: 36 },
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
  checkboxSelected: { backgroundColor: "#b65a36" },
  trackContent: { flex: 1 },
  trackTitle: { color: "#241a12", fontSize: 16, fontWeight: "600" },
  trackMeta: { color: "#85776a", fontSize: 13, marginTop: 3 },
  activeText: { color: "#b65a36" },
  playedTitle: { color: "#9a8d81" },
  unplayedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#b65a36",
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fff9f3",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#dbcbb9",
  },
  actionBarWithPlayer: { bottom: MINI_PLAYER_HEIGHT },
  actionBarCancel: { paddingHorizontal: 8, paddingVertical: 8 },
  actionBarCancelText: { fontSize: 16, color: "#6f6256", fontWeight: "600" },
  actionBarDelete: {
    backgroundColor: "#b42318",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBarDeleteDisabled: { opacity: 0.4 },
  actionBarDeleteText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
