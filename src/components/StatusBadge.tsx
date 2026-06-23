import { StyleSheet, Text, View } from "react-native";
import type { JobStatus } from "../types";
import { useTranslation } from "../i18n";

const LABELS: Record<JobStatus, string> = {
  queued: "progress.queued",
  processing: "progress.transcoding",
  ready: "progress.playable",
  failed: "home.conversionFailed",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.base,
        status === "processing" && styles.processing,
        status === "ready" && styles.ready,
        status === "failed" && styles.failed,
      ]}
    >
      <Text style={styles.text}>{t(LABELS[status])}</Text>
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
