import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiscoverItem } from "../features/discover/types";
import { useAppTheme } from "../app/theme";
import DiscoverCard from "./DiscoverCard";

// 横向 shelf：标题行 + 横向滚动的卡片。items 为空时整个 shelf 返回 null（连标题都不渲染）。
export default function DiscoverShelf({
  title,
  items,
  onPressItem,
  pendingJobId = null,
}: {
  title: string;
  items: DiscoverItem[];
  onPressItem: (item: DiscoverItem) => void;
  pendingJobId?: string | null;
}) {
  const { colors } = useAppTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.shelf}>
      <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <DiscoverCard
            key={item.jobId}
            item={item}
            onPress={() => onPressItem(item)}
            pending={pendingJobId === item.jobId}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  scrollContent: { gap: 12, paddingHorizontal: 2 },
});
