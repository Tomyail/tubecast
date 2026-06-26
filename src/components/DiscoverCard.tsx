import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { DiscoverItem } from "../features/discover/types";
import { useAppTheme } from "../app/theme";
import { formatDuration } from "../i18n/formatters";
import Touchable from "./Touchable";

const CARD_WIDTH = 140;

// 苹果播客式卡片：封面（正方形）+ 标题（2 行截断）+ 时长。整卡可点。不显示转换次数。
// pending 为 true 时降低透明度并叠加小 spinner，给点击后等待 getJob() 的即时反馈。
export default function DiscoverCard({
  item,
  onPress,
  pending = false,
}: {
  item: DiscoverItem;
  onPress: () => void;
  pending?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Touchable
      style={[styles.card, pending && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={pending}
    >
      <View style={[styles.thumbWrap, { backgroundColor: colors.elevatedSurface }]}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={300} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="musical-note" size={28} color={colors.secondaryText} />
          </View>
        )}
        {pending ? (
          <View style={styles.thumbOverlay}>
            <ActivityIndicator size="small" color={colors.tintText} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={2}>
        {item.title || ""}
      </Text>
      <Text style={[styles.duration, { color: colors.secondaryText }]}>{formatDuration(item.durationSeconds)}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, gap: 6 },
  thumbWrap: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, minHeight: 34, lineHeight: 17 },
  duration: { fontSize: 12 },
});
