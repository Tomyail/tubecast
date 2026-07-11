import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { DiscoverItem } from "../features/discover/types";
import { useAppTheme } from "../app/theme";
import { formatDuration } from "../i18n/formatters";
import { toExpoImageSource } from "../shared/imageSource";
import Touchable from "./Touchable";

const CARD_WIDTH = 164;
type DiscoverCardVariant = "compact" | "hero";

// 苹果播客式卡片：封面（正方形）+ 标题（2 行截断）+ 时长。整卡可点。不显示转换次数。
// pending 为 true 时降低透明度并叠加小 spinner，给点击后等待 getJob() 的即时反馈。
export default function DiscoverCard({
  item,
  onPress,
  pending = false,
  variant = "compact",
}: {
  item: DiscoverItem;
  onPress: () => void;
  pending?: boolean;
  variant?: DiscoverCardVariant;
}) {
  const { colors } = useAppTheme();
  const isHero = variant === "hero";
  const tintOnMedia = "#fffaf3";

  return (
    <Touchable
      accessibilityRole="button"
      style={[
        isHero
          ? [styles.heroCard, { backgroundColor: colors.surface }]
          : [styles.card, { backgroundColor: colors.surface }],
        pending && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={pending}
    >
      <View style={[isHero ? styles.heroThumbWrap : styles.thumbWrap, { backgroundColor: colors.elevatedSurface }]}>
        {item.thumbnailUrl ? (
          <Image source={toExpoImageSource(item.thumbnailUrl)} style={styles.thumb} contentFit="cover" transition={300} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="musical-note" size={28} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.durationPill}>
          <Text style={styles.durationPillText}>{formatDuration(item.durationSeconds)}</Text>
        </View>
        <View style={[styles.playBadge, isHero ? styles.heroPlayBadge : styles.compactPlayBadge]}>
          <Ionicons name="play" size={isHero ? 22 : 17} color={colors.tint} />
        </View>
        {pending ? (
          <View style={styles.thumbOverlay}>
            <ActivityIndicator size="small" color={tintOnMedia} />
          </View>
        ) : null}
      </View>
      <View style={isHero ? styles.heroTextBlock : styles.textBlock}>
        <Text style={[isHero ? styles.heroTitle : styles.title, { color: colors.primaryText }]} numberOfLines={isHero ? 2 : 2}>
          {item.title || ""}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    width: CARD_WIDTH,
    shadowColor: "#6b4a33",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#6b4a33",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  thumbWrap: { width: CARD_WIDTH, aspectRatio: 16 / 10, overflow: "hidden" },
  heroThumbWrap: { aspectRatio: 16 / 9, overflow: "hidden", width: "100%" },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  durationPill: {
    backgroundColor: "rgba(22, 18, 15, 0.72)",
    borderRadius: 8,
    bottom: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
  },
  durationPillText: { color: "#fffaf3", fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600" },
  playBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 243, 0.92)",
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#201913",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  compactPlayBadge: { borderRadius: 18, bottom: 10, height: 36, right: 10, width: 36 },
  heroPlayBadge: { borderRadius: 24, bottom: 14, height: 48, right: 14, width: 48 },
  thumbOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { padding: 12, paddingTop: 10 },
  heroTextBlock: { padding: 16, paddingTop: 14 },
  title: { fontSize: 15, fontWeight: "600", lineHeight: 20, minHeight: 40 },
  heroTitle: { fontSize: 19, fontWeight: "700", lineHeight: 25 },
});
