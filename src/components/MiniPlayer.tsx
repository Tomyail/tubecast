import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "../api";
import type { RootStackParamList } from "../app/navigation/types";
import { usePlayer } from "../features/player/context";
import { useTranslation } from "../i18n";

export default function MiniPlayer() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeTrack, currentTime, duration, isPlaying, togglePlayback } = usePlayer();

  if (!activeTrack) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.card}>
        <Pressable
          style={styles.tapArea}
          onPress={() => navigation.navigate("Player", { jobId: activeTrack.jobId })}
        >
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {activeTrack.title || activeTrack.sourceUrl}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Text>
        </View>
        </Pressable>
        <Pressable hitSlop={8} style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>{isPlaying ? t("common.pause") : t("common.play")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    bottom: 76,
    left: 12,
    position: "absolute",
    right: 12,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#211c18",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tapArea: {
    flex: 1,
  },
  textWrap: {
    gap: 4,
  },
  title: {
    color: "#fff8f0",
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: "#d8c6b4",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#b65a36",
    borderRadius: 14,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#fff7ef",
    fontSize: 13,
    fontWeight: "800",
  },
});
