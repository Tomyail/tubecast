import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import Screen from "../components/Screen";
import DiscoverShelf from "../components/DiscoverShelf";
import { useDiscover } from "../features/discover";
import type { DiscoverItem } from "../features/discover/types";
import { getJob, submitJob } from "../features/jobs/api";
import { trackFromReadyJob } from "../features/jobs/track";
import { usePlayer } from "../features/player/context";
import { usePlaylist } from "../features/playlist/context";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";

// 推荐流首页：苹果播客式纵向滚动 + 横向 shelf。粘贴入口降级为右下角 FAB。
export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, isError, refetch } = useDiscover();
  const { tracks } = usePlaylist();
  const { playTrack } = usePlayer();

  // 点击卡片兜底（决策 8）：实时查 job，未过期直接播；否则用 sourceId 重建 URL 重新转换。
  const handlePressItem = async (item: DiscoverItem) => {
    try {
      const job = await getJob(item.jobId);
      // audio_expires_at 是 SQLite datetime('now','+Nh') 写的 UTC 字串（空格分隔、无时区后缀），
      // 必须当 UTC 解析，否则本地时区设备会提前误判过期。
      const expiresAtMs = job.audioExpiresAt
        ? Date.parse(job.audioExpiresAt.replace(" ", "T") + "Z")
        : NaN;
      const playable = job.status === "ready" && !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
      if (playable) {
        await playTrack(trackFromReadyJob(job), tracks);
        navigation.navigate("Player", { jobId: item.jobId });
        return;
      }
      // 过期/非 ready → 重建规范 URL 触发新转换。依赖服务端 findActiveJobBySourceId 已把
      // ready 但音频过期的 job 视为非 active，故 submitJob 会真正创建新 job。
      const url = `https://www.youtube.com/watch?v=${item.sourceId}`;
      const result = await submitJob(url);
      navigation.navigate("Convert", { jobId: result.id });
    } catch {
      Alert.alert(t("common.error"), t("errors.generic"));
    }
  };

  const bothEmpty = !!data && data.recent.length === 0 && data.popular.length === 0;

  return (
    <Screen scroll={false}>
      <View style={styles.root}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.tint} />
            <Text style={[styles.muted, { color: colors.secondaryText }]}>{t("discover.loading")}</Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{t("discover.loadFailed")}</Text>
            <Pressable accessibilityRole="button" style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.tintText }]}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        ) : bothEmpty ? (
          <View style={styles.center}>
            <Text style={[styles.muted, { color: colors.secondaryText }]}>{t("discover.empty")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <DiscoverShelf title={t("discover.recent")} items={data?.recent ?? []} onPressItem={handlePressItem} />
            <DiscoverShelf title={t("discover.popular")} items={data?.popular ?? []} onPressItem={handlePressItem} />
          </ScrollView>
        )}

        {/* FAB：相对 root 的 absolute 子元素。Screen 在 MiniPlayer 显示时自动增大
            paddingBottom，root（flex:1）随之收缩，FAB 自动上抬避让，无需额外分支。 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.pasteUrl")}
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => navigation.navigate("Convert", {})}
        >
          <Ionicons name="add" size={30} color={colors.tintText} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
  scrollContent: { gap: 20, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { fontSize: 15, textAlign: "center" },
  errorText: { fontSize: 15, textAlign: "center" },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
