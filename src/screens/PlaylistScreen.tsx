import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { Directory, File, Paths } from "expo-file-system";
import Screen from "../components/Screen";
import EmptyState from "../components/EmptyState";
import Touchable from "../components/Touchable";
import { useTrackAudioExport } from "../features/audioExport/hooks";
import { usePlaylist } from "../features/playlist/context";
import { usePlayer } from "../features/player/context";
import type { Track } from "../features/playlist/storage";
import { useTranslation } from "../i18n";
import { formatDuration, formatFileSize } from "../i18n/formatters";
import { useAppTheme } from "../app/theme";
import { getPlaylistFilterCounts, getVisiblePlaylistTracks } from "./playlistFilter";
import type { PlaylistFilter } from "./playlistFilter";

type PlaylistStackParamList = { PlaylistRoot: undefined };
const MINI_PLAYER_HEIGHT = 64;

export default function PlaylistScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<PlaylistStackParamList>>();
  const { tracks, deleteTrack, deleteTracks, reorderTracks } = usePlaylist();
  const { playTrack, togglePlayback, activeTrack, isPlaying, playbackLoading, stopPlayback } = usePlayer();
  const { exportingTrackId, exportTrack } = useTrackAudioExport();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PlaylistFilter>("all");

  const visibleTracks = useMemo(() => getVisiblePlaylistTracks(tracks, filter), [filter, tracks]);
  const filterCounts = useMemo(() => getPlaylistFilterCounts(tracks), [tracks]);
  const visibleTrackIds = useMemo(() => new Set(visibleTracks.map((track) => track.id)), [visibleTracks]);
  const allSelected = visibleTracks.length > 0 && visibleTracks.every((track) => selectedIds.has(track.id));
  const canReorder = filter === "all" && !isEditMode;

  useEffect(() => {
    if (!isEditMode || selectedIds.size === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visibleTrackIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [isEditMode, selectedIds.size, visibleTrackIds]);

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

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(visibleTracks.map((t) => t.id)));
  }, [allSelected, visibleTracks]);

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
    // 点击正在播放的曲目时切换暂停/继续，而非重新走 replace+seek 流程
    if (activeTrack?.id === track.id) {
      if (playbackLoading) return;
      void togglePlayback();
      return;
    }
    void playTrack(track, visibleTracks);
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
            <Touchable onPress={toggleSelectAll} style={styles.navigationAction}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>{allSelected ? t("playlist.clearAll") : t("playlist.selectAll")}</Text>
            </Touchable>
          )
        : undefined,
      headerRight: isEditMode
        ? () => (
            <Touchable onPress={exitEditMode} style={styles.navigationAction}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>{t("common.done")}</Text>
            </Touchable>
          )
        : visibleTracks.length > 0
          ? () => (
              <Touchable onPress={enterEditMode} style={styles.navigationAction}>
                <Text style={[styles.headerAction, { color: colors.tint }]}>{t("playlist.edit")}</Text>
              </Touchable>
            )
          : undefined,
    });
  }, [allSelected, colors.tint, isEditMode, navigation, selectedIds.size, t, toggleSelectAll, visibleTracks.length]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Track>) => {
    const isCurrentTrack = activeTrack?.id === item.id;
    return (
      <ScaleDecorator>
        <SwipeableTrackItem
          track={item}
          isActive={isCurrentTrack}
          isLoading={isCurrentTrack && playbackLoading}
          isPlaying={isPlaying}
          isDragging={isActive}
          isEditMode={isEditMode}
          isSelected={selectedIds.has(item.id)}
          onPlay={handlePlay}
          onExport={exportTrack}
          onDelete={handleDelete}
          onDrag={canReorder ? drag : undefined}
          onToggleSelect={toggleSelect}
          isExporting={exportingTrackId === item.id}
          t={t}
          locale={i18n.language}
          colors={colors}
        />
      </ScaleDecorator>
    );
  };

  return (
    <Screen reserveMiniPlayerSpace={false} scroll={false}>
      {tracks.length === 0 ? (
        <EmptyState icon="musical-notes-outline" title={t("playlist.empty")} />
      ) : (
        <>
          {!isEditMode && (
            <View style={[styles.filterBar, { backgroundColor: colors.elevatedSurface, borderColor: colors.border }]}>
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === "all" }}
                style={[styles.filterSegment, filter === "all" && { backgroundColor: colors.tint }]}
                onPress={() => setFilter("all")}
              >
                <Text style={[styles.filterText, { color: filter === "all" ? colors.tintText : colors.secondaryText }]}>
                  {t("playlist.filterAll", { count: filterCounts.all })}
                </Text>
              </Touchable>
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === "unplayed" }}
                style={[styles.filterSegment, filter === "unplayed" && { backgroundColor: colors.tint }]}
                onPress={() => setFilter("unplayed")}
              >
                <Text style={[styles.filterText, { color: filter === "unplayed" ? colors.tintText : colors.secondaryText }]}>
                  {t("playlist.filterUnplayed", { count: filterCounts.unplayed })}
                </Text>
              </Touchable>
            </View>
          )}

          {visibleTracks.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title={t("playlist.emptyUnplayed")} />
          ) : (
            <DraggableFlatList
              data={visibleTracks}
              keyExtractor={(t) => t.id}
              renderItem={renderItem}
              onDragEnd={canReorder ? ({ data }) => reorderTracks(data) : () => {}}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: isEditMode ? 84 + (activeTrack ? MINI_PLAYER_HEIGHT : 0) : activeTrack ? MINI_PLAYER_HEIGHT : 0 }}
            />
          )}
        </>
      )}

      {isEditMode && (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }, activeTrack && styles.actionBarWithPlayer]}>
          <Touchable style={styles.actionBarCancel} onPress={exitEditMode}>
            <Text style={[styles.actionBarCancelText, { color: colors.secondaryText }]}>{t("common.cancel")}</Text>
          </Touchable>
          <Touchable
            style={[
              styles.actionBarDelete,
              { backgroundColor: colors.destructive },
              selectedIds.size === 0 && styles.actionBarDeleteDisabled,
            ]}
            onPress={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            <Text style={[styles.actionBarDeleteText, { color: colors.tintText }]}>
              {selectedIds.size > 0 ? t("playlist.deleteSelected", { count: selectedIds.size }) : t("common.delete")}
            </Text>
          </Touchable>
        </View>
      )}
    </Screen>
  );
}

function SwipeableTrackItem({
  track,
  isActive,
  isLoading,
  isPlaying,
  isDragging,
  isEditMode,
  isExporting,
  isSelected,
  onPlay,
  onExport,
  onDelete,
  onDrag,
  onToggleSelect,
  t,
  locale,
  colors,
}: {
  track: Track;
  isActive: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isDragging: boolean;
  isEditMode: boolean;
  isExporting: boolean;
  isSelected: boolean;
  onPlay: (t: Track) => void;
  onExport: (t: Track) => Promise<void>;
  onDelete: (t: Track) => void;
  onDrag?: () => void;
  onToggleSelect: (id: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const swipeRef = useRef<Swipeable>(null);

  const rowContent = (
    <Touchable
      style={[
        styles.trackItem,
        { backgroundColor: colors.background },
        isActive && !isEditMode && { backgroundColor: colors.elevatedSurface },
        isDragging && [styles.draggingItem, { backgroundColor: colors.surface }],
        isSelected && { backgroundColor: colors.elevatedSurface },
      ]}
      onPress={() => (isEditMode ? onToggleSelect(track.id) : onPlay(track))}
    >
      {isEditMode ? (
        <View style={[styles.checkbox, { borderColor: colors.tint }, isSelected && { backgroundColor: colors.tint }]}>
          {isSelected && <Ionicons name="checkmark" size={15} color={colors.tintText} />}
        </View>
      ) : (
        onDrag ? (
          <Touchable accessibilityLabel="Reorder track" accessibilityRole="button" onLongPress={onDrag} style={styles.dragHandle}>
            <Ionicons name="reorder-three-outline" size={22} color={colors.secondaryText} />
          </Touchable>
        ) : (
          <View style={styles.dragHandle} />
        )
      )}

      <View style={styles.trackContent}>
        <Text
          style={[
            styles.trackTitle, { color: colors.primaryText },
            isActive && !isEditMode && { color: colors.tint },
            track.playCount > 0 && !isActive && { color: colors.secondaryText },
          ]}
          numberOfLines={1}
        >
          {track.title || t("common.untitled")}
        </Text>
        <Text style={[styles.trackMeta, { color: colors.secondaryText }]}>
          {formatDuration(track.durationSeconds)} | {formatFileSize(track.fileSize, locale)}
          {track.playCount > 0 && !isActive && ` · ${t("playlist.listened")}`}
        </Text>
      </View>

      {!isEditMode && (
        isLoading ? (
          <Ionicons name="hourglass-outline" size={19} color={colors.tint} />
        ) : isActive && isPlaying ? (
          <Ionicons name="volume-high" size={19} color={colors.tint} />
        ) : !isActive && track.playCount === 0 ? (
          <View style={[styles.unplayedDot, { backgroundColor: colors.tint }]} />
        ) : null
      )}
    </Touchable>
  );

  if (isEditMode) {
    return rowContent;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <Touchable
            accessibilityLabel={t("audioExport.action")}
            accessibilityRole="button"
            disabled={isExporting}
            style={[styles.exportAction, { backgroundColor: colors.tint }, isExporting && styles.exportActionDisabled]}
            onPress={() => {
              swipeRef.current?.close();
              void onExport(track);
            }}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.tintText} />
            ) : (
              <Ionicons name="share-outline" size={19} color={colors.tintText} />
            )}
            <Text numberOfLines={1} style={[styles.swipeActionText, { color: colors.tintText }]}>
              {isExporting ? t("audioExport.exporting") : t("audioExport.action")}
            </Text>
          </Touchable>
          <Touchable
            style={[styles.deleteAction, { backgroundColor: colors.destructive }]}
            onPress={() => {
              swipeRef.current?.close();
              onDelete(track);
            }}
          >
            <Text style={[styles.swipeActionText, { color: colors.tintText }]}>{t("common.delete")}</Text>
          </Touchable>
        </View>
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
  filterBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterSegment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  filterText: { fontSize: 15, fontWeight: "700" },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f4ede2",
  },
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
  trackContent: { flex: 1 },
  trackTitle: { color: "#241a12", fontSize: 16, fontWeight: "600" },
  trackMeta: { color: "#85776a", fontSize: 13, marginTop: 3 },
  unplayedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#b65a36",
    marginLeft: 8,
  },
  separator: { height: StyleSheet.hairlineWidth },
  swipeActions: {
    flexDirection: "row",
    width: 176,
  },
  exportAction: {
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    width: 96,
  },
  exportActionDisabled: { opacity: 0.7 },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  swipeActionText: { color: "#fff", fontWeight: "600", fontSize: 13 },
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
