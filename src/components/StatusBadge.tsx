import { StyleSheet, Text, View } from "react-native";
import type { JobStatus } from "../types";

const LABELS: Record<JobStatus, string> = {
  queued: "排队中",
  processing: "转换中",
  ready: "可播放",
  failed: "失败",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <View
      style={[
        styles.base,
        status === "processing" && styles.processing,
        status === "ready" && styles.ready,
        status === "failed" && styles.failed,
      ]}
    >
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#e6dbd0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  processing: {
    backgroundColor: "#f6d59f",
  },
  ready: {
    backgroundColor: "#bde1c0",
  },
  failed: {
    backgroundColor: "#f0c3c1",
  },
  text: {
    color: "#3f3026",
    fontSize: 12,
    fontWeight: "800",
  },
});
