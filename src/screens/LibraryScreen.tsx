import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import Screen from "../components/Screen";
import { useHideLibraryItem, useLibraryList } from "../features/jobs/hooks";
import type { JobResponse } from "../features/jobs/api";
import { formatDuration } from "../api";
import { useAppTheme } from "../app/theme";

type LibraryFilter = "all" | JobResponse["status"];

const FILTERS: Array<{ key: LibraryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "ready", label: "可播放" },
  { key: "processing", label: "转换中" },
  { key: "failed", label: "失败" },
  { key: "queued", label: "排队中" },
];

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useAppTheme();
  const jobsQuery = useLibraryList();
  const hideLibraryItemMutation = useHideLibraryItem();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const filteredJobs = useMemo(() => {
    const jobs = jobsQuery.data ?? [];
    return filter === "all" ? jobs : jobs.filter((job: JobResponse) => job.status === filter);
  }, [filter, jobsQuery.data]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primaryText }]}>媒体库</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>先把列表独立出来，后续再补筛选、重试和下载视图。</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.filterChip, { backgroundColor: filter === item.key ? colors.tint : colors.elevatedSurface }]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterChipText, { color: filter === item.key ? colors.tintText : colors.primaryText }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {filteredJobs.map((job: JobResponse) => (
          <Pressable
            key={job.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Player", { jobId: job.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.textWrap}>
                <Text style={[styles.cardTitle, { color: colors.primaryText }]} numberOfLines={1}>
                  {job.title || job.sourceUrl}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.secondaryText }]} numberOfLines={1}>
                  {formatDuration(job.durationSeconds)} · {job.status}
                </Text>
              </View>
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.secondaryText }]}>{job.sourceUrl}</Text>
                <Pressable
                  disabled={hideLibraryItemMutation.isPending}
                  onPress={() => {
                    Alert.alert("移出列表？", "任务记录和音频文件不会被删除，只从你的列表中移除。", [
                      { text: "取消", style: "cancel" },
                      {
                        text: "移出",
                        style: "destructive",
                        onPress: () => {
                          void hideLibraryItemMutation.mutateAsync(job.id);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={[styles.deleteText, { color: colors.destructive }]}>移出列表</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}
        {!filteredJobs.length ? (
          <Text style={[styles.empty, { color: colors.secondaryText }]}>
            {jobsQuery.data?.length ? "当前筛选下没有任务。" : "还没有任务。"}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    color: "#241a12",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6f6256",
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    backgroundColor: "#f1dfc7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: "#b65a36",
  },
  filterChipText: {
    color: "#6d371f",
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#fff7ef",
  },
  card: {
    backgroundColor: "#fff9f3",
    borderColor: "#d8c9b8",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: "#241a12",
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    color: "#706353",
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  footerText: {
    color: "#6f6256",
    flex: 1,
    fontSize: 12,
  },
  deleteText: {
    color: "#bb3f36",
    fontSize: 13,
    fontWeight: "800",
  },
  empty: {
    color: "#6f6256",
    fontSize: 14,
  },
});
