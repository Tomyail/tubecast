import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useSettings } from "../features/settings/context";
import { getAllTracks } from "../features/playlist/storage";

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [authToken, setAuthToken] = useState(settings.authToken);
  const [youtubeApiKey, setYoutubeApiKey] = useState(settings.youtubeApiKey);
  const [storageInfo, setStorageInfo] = useState<string>("");

  const handleSave = async () => {
    await updateSettings({ serverUrl, authToken, youtubeApiKey });
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
      <Text style={styles.label}>Server URL</Text>
      <TextInput
        style={styles.input}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="https://your-worker.workers.dev"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.label}>Auth Token</Text>
      <TextInput
        style={styles.input}
        value={authToken}
        onChangeText={setAuthToken}
        placeholder="Your auth token"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
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
});
