import { Ionicons } from "@expo/vector-icons";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useRemoveChannel, useSubscribedChannels } from "../features/youtubeFeed/hooks";
import type { FeedSource } from "../features/youtubeFeed/types";
import { useTranslation } from "../i18n";

export default function ManageChannelsScreen() {
  const { t } = useTranslation();
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
    <Screen scroll={false}>
      <FlatList
        data={channels}
        keyExtractor={(channel) => channel.platformSourceId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.thumbnail}>
              {item.thumbnailUrl ? (
                <Image resizeMode="cover" source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} />
              ) : (
                <Ionicons name="play" size={20} color="#b65a36" />
              )}
            </View>
            <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
            <Pressable
              accessibilityLabel={`${t("common.remove")} ${item.title}`}
              accessibilityRole="button"
              disabled={removeChannel.isPending}
              onPress={() => confirmRemove(item)}
              style={styles.removeButton}
            >
              <Text style={styles.removeText}>{t("common.remove")}</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={32} color="#8b7d70" />
            <Text style={styles.emptyText}>{t("feed.noSubscriptions")}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingVertical: 4 },
  row: { alignItems: "center", borderBottomColor: "#e2d7c9", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, minHeight: 72, paddingVertical: 10 },
  thumbnail: { alignItems: "center", backgroundColor: "#f1dfc7", borderRadius: 10, height: 48, justifyContent: "center", overflow: "hidden", width: 48 },
  thumbnailImage: { height: "100%", width: "100%" },
  title: { color: "#241a12", flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 20 },
  removeButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 4 },
  removeText: { color: "#b42318", fontSize: 16 },
  emptyState: { alignItems: "center", gap: 10, marginTop: 72 },
  emptyText: { color: "#6f6256", fontSize: 16 },
});
