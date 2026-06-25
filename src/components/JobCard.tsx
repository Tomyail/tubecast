import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "../i18n/formatters";
import type { Job } from "../types";
import StatusBadge from "./StatusBadge";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";

export default function JobCard({
  job,
  onPress,
  footer,
}: {
  job: Job;
  onPress?: () => void;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>
            {job.title || job.sourceUrl}
          </Text>
          <Text style={[styles.meta, { color: colors.secondaryText }]} numberOfLines={1}>
            {job.channelName || t("common.unknown")} · {formatDuration(job.durationSeconds)}
          </Text>
        </View>
        <StatusBadge status={job.status} />
      </View>
      {footer}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff9f3",
    borderColor: "#d8c9b8",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#241a12",
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: "#706353",
    fontSize: 13,
  },
});
