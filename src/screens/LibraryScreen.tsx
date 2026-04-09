import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import JobCard from "../components/JobCard";
import Screen from "../components/Screen";
import { useHideLibraryItem, useLibraryList } from "../features/jobs/hooks";
import type { JobStatus } from "../types";

type LibraryFilter = "all" | JobStatus;

const FILTERS: Array<{ key: LibraryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "ready", label: "可播放" },
  { key: "processing", label: "转换中" },
  { key: "failed", label: "失败" },
  { key: "queued", label: "排队中" },
];

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const jobsQuery = useLibraryList();
  const hideLibraryItemMutation = useHideLibraryItem();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const filteredJobs = useMemo(() => {
    const jobs = jobsQuery.data ?? [];
    return filter === "all" ? jobs : jobs.filter((job) => job.status === filter);
  }, [filter, jobsQuery.data]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>媒体库</Text>
        <Text style={styles.subtitle}>先把列表独立出来，后续再补筛选、重试和下载视图。</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {filteredJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onPress={() => {
              navigation.navigate("Player", { jobId: job.id });
            }}
            footer={(
              <View style={styles.footer}>
                <Text style={styles.footerText}>{job.sourceUrl}</Text>
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
                  <Text style={styles.deleteText}>移出列表</Text>
                </Pressable>
              </View>
            )}
          />
        ))}
        {!filteredJobs.length ? (
          <Text style={styles.empty}>
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
