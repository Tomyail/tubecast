import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DiscoverItem } from "../features/discover/types";
import { useAppTheme } from "../app/theme";
import { formatDuration } from "../i18n/formatters";

const CARD_WIDTH = 140;

// 苹果播客式卡片：封面（正方形）+ 标题（2 行截断）+ 时长。整卡可点。不显示转换次数。
export default function DiscoverCard({ item, onPress }: { item: DiscoverItem; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.thumbWrap, { backgroundColor: colors.elevatedSurface }]}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="musical-note" size={28} color={colors.secondaryText} />
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={2}>
        {item.title || ""}
      </Text>
      <Text style={[styles.duration, { color: colors.secondaryText }]}>{formatDuration(item.durationSeconds)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, gap: 6 },
  thumbWrap: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, minHeight: 34, lineHeight: 17 },
  duration: { fontSize: 12 },
});
