import { StyleSheet, Text, View } from "react-native";
import type { JobStatus } from "../types";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";

const LABELS: Record<JobStatus, string> = {
  queued: "progress.queued",
  processing: "progress.transcoding",
  ready: "progress.playable",
  failed: "home.conversionFailed",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const backgroundColor = status === "failed" ? colors.destructive : status === "ready" ? colors.tint : colors.elevatedSurface;
  const color = status === "failed" || status === "ready" ? colors.tintText : colors.primaryText;
  return (
    <View
      style={[
        styles.base, { backgroundColor },
      ]}
    >
      <Text style={[styles.text, { color }]}>{t(LABELS[status])}</Text>
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
