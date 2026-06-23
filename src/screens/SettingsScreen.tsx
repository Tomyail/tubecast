import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { getAllTracks } from "../features/playlist/storage";
import { SERVER_URL } from "../features/settings/storage";
import { formatFileSize } from "../i18n/formatters";
import { useAppLanguage, useTranslation } from "../i18n";

export default function SettingsScreen() {
  const [storageInfo, setStorageInfo] = useState<string>("");
  const { t } = useTranslation();
  const { preference, language, setLanguage } = useAppLanguage();

  const checkStorage = async () => {
    const tracks = await getAllTracks();
    const totalBytes = tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);
    setStorageInfo(t("settings.storage", { count: tracks.length, size: formatFileSize(totalBytes, language) }));
  };

  return (
    <Screen>
      <Text style={styles.title}>{t("settings.title")}</Text>
      <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
      <View style={styles.languageChoices}>
        {(["system", "zh-CN", "en"] as const).map((option) => (
          <Pressable key={option} style={[styles.languageButton, preference === option && styles.languageButtonSelected]} onPress={() => void setLanguage(option)}>
            <Text style={[styles.languageText, preference === option && styles.languageTextSelected]}>{t(`settings.${option === "zh-CN" ? "chinese" : option === "en" ? "english" : "system"}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.storageButton} onPress={checkStorage}>
        <Text style={styles.storageText}>{t("settings.checkStorage")}</Text>
      </Pressable>
      {storageInfo ? <Text style={styles.storageInfo}>{storageInfo}</Text> : null}

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>{t("settings.about")}</Text>
        <Text style={styles.aboutText}>{t("settings.description")}</Text>
        <Text style={styles.aboutText}>API: {SERVER_URL}</Text>
        <Text
          style={[styles.aboutText, styles.link]}
          onPress={() => Linking.openURL("https://github.com/Tomyail/tubecast")}
        >
          {t("settings.source")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#555" },
  languageChoices: { flexDirection: "row", gap: 8, marginBottom: 24 },
  languageButton: { borderWidth: 1, borderColor: "#dbcbb9", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  languageButtonSelected: { backgroundColor: "#b65a36", borderColor: "#b65a36" },
  languageText: { color: "#555", fontSize: 14 },
  languageTextSelected: { color: "#fff", fontWeight: "600" },
  storageButton: { backgroundColor: "#eee", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  storageText: { fontSize: 14, color: "#555" },
  storageInfo: { textAlign: "center", marginTop: 12, fontSize: 16, color: "#333" },
  link: { color: "#FF6B35", textDecorationLine: "underline" },
  about: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  aboutTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#555" },
  aboutText: { fontSize: 13, color: "#888", marginBottom: 4 },
});
