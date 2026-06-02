import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useSettings } from "../features/settings/context";
import { getAllTracks } from "../features/playlist/storage";
import { SERVER_URL } from "../features/settings/storage";

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [youtubeApiKey, setYoutubeApiKey] = useState(settings.youtubeApiKey);
  const [storageInfo, setStorageInfo] = useState<string>("");

  const handleSave = async () => {
    await updateSettings({ youtubeApiKey });
    Alert.alert("Saved", "Settings updated");
  };

  const checkStorage = async () => {
    const tracks = await getAllTracks();
    const totalBytes = tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);
    setStorageInfo(`${tracks.length} tracks, ${formatFileSize(totalBytes)}`);
  };

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>YouTube API Key</Text>
      <TextInput
        style={styles.input}
        value={youtubeApiKey}
        onChangeText={setYoutubeApiKey}
        placeholder="Your YouTube Data API key"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>
        Get a key by enabling{" "}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL("https://console.cloud.google.com/apis/library/youtube.googleapis.com")}
        >
          YouTube Data API v3
        </Text>
        {" "}in Google Cloud Console, then create credentials under{" "}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL("https://console.cloud.google.com/apis/credentials")}
        >
          APIs &amp; Services → Credentials
        </Text>
        .
      </Text>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

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
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4, color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 16 },
  saveButton: { backgroundColor: "#FF6B35", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginBottom: 16 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  storageButton: { backgroundColor: "#eee", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  storageText: { fontSize: 14, color: "#555" },
  storageInfo: { textAlign: "center", marginTop: 12, fontSize: 16, color: "#333" },
  hint: { fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 18 },
  link: { color: "#FF6B35", textDecorationLine: "underline" },
  about: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  aboutTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#555" },
  aboutText: { fontSize: 13, color: "#888", marginBottom: 4 },
});
