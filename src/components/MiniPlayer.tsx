import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "../i18n/formatters";
import type { RootStackParamList } from "../app/navigation/types";
import { usePlayer } from "../features/player/context";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";
import Touchable from "./Touchable";

export default function MiniPlayer({ tabBarHeight }: { tabBarHeight: number }) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeTrack, currentTime, duration, isPlaying, togglePlayback } = usePlayer();

  if (!activeTrack) {
    return null;
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <View pointerEvents="box-none" style={[styles.shell, { bottom: tabBarHeight }]}>
      <View style={[styles.card, { backgroundColor: isDark ? colors.elevatedSurface : "#211c18", borderTopColor: colors.border }]}>
        <Touchable
          accessibilityLabel={activeTrack.title || activeTrack.sourceUrl}
          accessibilityRole="button"
          style={styles.tapArea}
          onPress={() => navigation.navigate("Player", { jobId: activeTrack.jobId })}
        >
        <View style={styles.textWrap}>
          <View style={styles.thumbRow}>
            <View style={[styles.thumbnail, { backgroundColor: colors.elevatedSurface }]}>
              {activeTrack.thumbnailUrl ? (
                <Image resizeMode="cover" source={{ uri: activeTrack.thumbnailUrl }} style={styles.thumbnailImage} />
              ) : (
                <Ionicons name="musical-note" size={20} color={colors.tint} />
              )}
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: isDark ? colors.primaryText : "#fff8f0" }]} numberOfLines={1}>
                {activeTrack.title || activeTrack.sourceUrl}
              </Text>
              <Text style={[styles.meta, { color: isDark ? colors.secondaryText : "#d8c6b4" }]} numberOfLines={1}>
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </Text>
            </View>
          </View>
        </View>
        </Touchable>
        <Touchable
          accessibilityLabel={isPlaying ? t("common.pause") : t("common.play")}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={togglePlayback}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={19} color={colors.tintText} />
        </Touchable>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#211c18",
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tapArea: {
    flex: 1,
  },
  thumbRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  thumbnail: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  thumbnailImage: { height: "100%", width: "100%" },
  textWrap: {
    gap: 4,
  },
  title: {
    color: "#fff8f0",
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: "#d8c6b4",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#b65a36",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    width: 44,
  },
  progressTrack: {
    bottom: 0,
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
  },
  progressFill: {
    height: 2,
  },
});
