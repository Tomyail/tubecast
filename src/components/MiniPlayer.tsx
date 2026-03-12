import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "../api";
import type { RootStackParamList } from "../app/navigation/types";
import { usePlayer } from "../features/player/context";

export default function MiniPlayer() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeJob, currentTime, duration, isPlaying, togglePlayback } = usePlayer();

  if (!activeJob) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("Player", { jobId: activeJob.id })}
      >
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {activeJob.title || activeJob.sourceUrl}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Text>
        </View>
        <Pressable style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>{isPlaying ? "暂停" : "播放"}</Text>
        </Pressable>
      </Pressable>
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
  textWrap: {
    flex: 1,
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
