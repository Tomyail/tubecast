import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { getAllTracks } from "../features/playlist/storage";
import { SERVER_URL } from "../features/settings/storage";

export default function SettingsScreen() {
  const [storageInfo, setStorageInfo] = useState<string>("");

  const checkStorage = async () => {
    const tracks = await getAllTracks();
    const totalBytes = tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);
    setStorageInfo(`${tracks.length} tracks, ${formatFileSize(totalBytes)}`);
  };

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      <Pressable style={styles.storageButton} onPress={checkStorage}>
        <Text style={styles.storageText}>Check Storage</Text>
      </Pressable>
      {storageInfo ? <Text style={styles.storageInfo}>{storageInfo}</Text> : null}

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>About</Text>
        <Text style={styles.aboutText}>yt-audio — YouTube to audio converter</Text>
        <Text style={styles.aboutText}>API: {SERVER_URL}</Text>
        <Text
          style={[styles.aboutText, styles.link]}
          onPress={() => Linking.openURL("https://gitea.tomyail.com/tomyail/yt-audio")}
        >
          Source code
        </Text>
      </View>
    </Screen>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  storageButton: { backgroundColor: "#eee", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  storageText: { fontSize: 14, color: "#555" },
  storageInfo: { textAlign: "center", marginTop: 12, fontSize: 16, color: "#333" },
  link: { color: "#FF6B35", textDecorationLine: "underline" },
  about: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  aboutTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#555" },
  aboutText: { fontSize: 13, color: "#888", marginBottom: 4 },
});
