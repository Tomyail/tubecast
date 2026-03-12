import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import JobCard from "../components/JobCard";
import Screen from "../components/Screen";
import { useDeleteJob, useJobsList } from "../features/jobs/hooks";
import { usePlayer } from "../features/player/context";

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const jobsQuery = useJobsList();
  const deleteJobMutation = useDeleteJob();
  const { setActiveJob } = usePlayer();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>媒体库</Text>
        <Text style={styles.subtitle}>先把列表独立出来，后续再补筛选、重试和下载视图。</Text>
      </View>

      <View style={styles.list}>
        {jobsQuery.data?.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onPress={() => {
              if (job.status === "ready") {
                setActiveJob(job, jobsQuery.data ?? []);
              }
              navigation.navigate("Player", { jobId: job.id });
            }}
            footer={(
              <View style={styles.footer}>
                <Text style={styles.footerText}>{job.sourceUrl}</Text>
                <Pressable
                  disabled={deleteJobMutation.isPending}
                  onPress={() => {
                    Alert.alert("删除任务？", "这会删除任务记录和对应音频文件。", [
                      { text: "取消", style: "cancel" },
                      {
                        text: "删除",
                        style: "destructive",
                        onPress: () => {
                          void deleteJobMutation.mutateAsync(job.id);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.deleteText}>删除</Text>
                </Pressable>
              </View>
            )}
          />
        ))}
        {!jobsQuery.data?.length ? <Text style={styles.empty}>还没有任务。</Text> : null}
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
