import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRemoveChannel, useSubscribedChannels } from "../features/youtubeFeed/hooks";
import type { FeedSource } from "../features/youtubeFeed/types";
import { useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";
import { toExpoImageSource } from "../shared/imageSource";
import { getManageChannelsListBottomPadding, getManageChannelsListContentHeight, manageChannelsListTopPadding } from "./manageChannelsLayout";

export default function ManageChannelsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: channels = [] } = useSubscribedChannels();
  const removeChannel = useRemoveChannel();

  const confirmRemove = (channel: FeedSource) => {
    Alert.alert(t("feed.removeTitle"), t("feed.removeMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => removeChannel.mutate(channel.platformSourceId),
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.listContent,
        {
          height: channels.length > 0 ? getManageChannelsListContentHeight(channels.length, insets.bottom) : undefined,
          paddingBottom: getManageChannelsListBottomPadding(insets.bottom),
        },
      ]}
    >
      {channels.map((channel) => (
        <View key={channel.platformSourceId} style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.thumbnail, { backgroundColor: colors.elevatedSurface }]}>
            {channel.thumbnailUrl ? (
              <Image source={toExpoImageSource(channel.thumbnailUrl)} style={styles.thumbnailImage} contentFit="cover" transition={300} />
            ) : (
              <Ionicons name="play" size={20} color={colors.tint} />
            )}
          </View>
          <Text numberOfLines={2} style={[styles.title, { color: colors.primaryText }]}>{channel.title}</Text>
          <Pressable
            accessibilityLabel={`${t("common.remove")} ${channel.title}`}
            accessibilityRole="button"
            disabled={removeChannel.isPending}
            onPress={() => confirmRemove(channel)}
            style={styles.removeButton}
          >
            <Text style={[styles.removeText, { color: colors.destructive }]}>{t("common.remove")}</Text>
          </Pressable>
        </View>
      ))}
      {channels.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={32} color={colors.secondaryText} />
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t("feed.noSubscriptions")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 12 + manageChannelsListTopPadding },
  row: { alignItems: "center", borderBottomColor: "#e2d7c9", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, minHeight: 72, paddingVertical: 10 },
  thumbnail: { alignItems: "center", backgroundColor: "#f1dfc7", borderRadius: 10, height: 48, justifyContent: "center", overflow: "hidden", width: 48 },
  thumbnailImage: { height: "100%", width: "100%" },
  title: { color: "#241a12", flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 20 },
  removeButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 4 },
  removeText: { color: "#b42318", fontSize: 16 },
  emptyState: { alignItems: "center", gap: 10, marginTop: 72 },
  emptyText: { color: "#6f6256", fontSize: 16 },
});
