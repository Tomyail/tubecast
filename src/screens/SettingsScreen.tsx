import { Ionicons } from "@expo/vector-icons";
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
    const totalBytes = tracks.reduce((sum, track) => sum + (track.fileSize || 0), 0);
    setStorageInfo(t("settings.storage", { count: tracks.length, size: formatFileSize(totalBytes, language) }));
  };

  return (
    <Screen>
      <Section title={t("settings.language")}>
        <View style={styles.languageChoices}>
          {(["system", "zh-CN", "en"] as const).map((option) => {
            const selected = preference === option;
            const label = t(`settings.${option === "zh-CN" ? "chinese" : option === "en" ? "english" : "system"}`);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                style={[styles.languageButton, selected && styles.languageButtonSelected]}
                onPress={() => void setLanguage(option)}
              >
                <Text numberOfLines={1} style={[styles.languageText, selected && styles.languageTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={t("settings.checkStorage")}>
        <Pressable accessibilityRole="button" onPress={checkStorage} style={styles.settingRow}>
          <View style={[styles.rowIcon, styles.storageIcon]}><Ionicons name="folder-outline" size={20} color="#8b5c48" /></View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{t("settings.checkStorage")}</Text>
            <Text numberOfLines={1} style={styles.rowDetail}>{storageInfo || t("settings.storage", { count: 0, size: formatFileSize(0, language) })}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9a8d81" />
        </Pressable>
      </Section>

      <Section title={t("settings.about")}>
        <View style={styles.aboutHeader}>
          <View style={[styles.rowIcon, styles.aboutIcon]}><Ionicons name="play-circle" size={20} color="#fff9f3" /></View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>TubeCast</Text>
            <Text style={styles.rowDetail}>{t("settings.description")}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.settingRow}>
          <View style={[styles.rowIcon, styles.serverIcon]}><Ionicons name="server-outline" size={18} color="#6f6256" /></View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>API</Text>
            <Text numberOfLines={1} style={styles.rowDetail}>{SERVER_URL}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://github.com/Tomyail/tubecast")} style={styles.settingRow}>
          <View style={[styles.rowIcon, styles.sourceIcon]}><Ionicons name="logo-github" size={19} color="#fff9f3" /></View>
          <Text style={[styles.rowTitle, styles.sourceTitle]}>{t("settings.source")}</Text>
          <Ionicons name="arrow-up-right-box" size={18} color="#8b5c48" />
        </Pressable>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.group}>{children}</View></View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { color: "#6f6256", fontSize: 13, fontWeight: "600", paddingHorizontal: 4, textTransform: "uppercase" },
  group: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  languageChoices: { flexDirection: "row", gap: 8, padding: 10 },
  languageButton: { alignItems: "center", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 8 },
  languageButtonSelected: { backgroundColor: "#b65a36" },
  languageText: { color: "#6f6256", fontSize: 14 },
  languageTextSelected: { color: "#fff9f3", fontWeight: "600" },
  settingRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  aboutHeader: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { alignItems: "center", borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  storageIcon: { backgroundColor: "#f1dfc7" },
  aboutIcon: { backgroundColor: "#b65a36" },
  serverIcon: { backgroundColor: "#eee6dc" },
  sourceIcon: { backgroundColor: "#3f3026" },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { color: "#241a12", flex: 1, fontSize: 16, fontWeight: "600" },
  rowDetail: { color: "#85776a", fontSize: 13 },
  sourceTitle: { color: "#8b5c48" },
  separator: { backgroundColor: "#e2d7c9", height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
