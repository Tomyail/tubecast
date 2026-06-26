import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import Touchable from "../components/Touchable";
import { getAllTracks } from "../features/playlist/storage";
import { SERVER_URL } from "../features/settings/storage";
import { formatFileSize } from "../i18n/formatters";
import { useAppLanguage, useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";

export default function SettingsScreen() {
  const [storageInfo, setStorageInfo] = useState<string>("");
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { preference, language, setLanguage } = useAppLanguage();

  const checkStorage = async () => {
    const tracks = await getAllTracks();
    const totalBytes = tracks.reduce((sum, track) => sum + (track.fileSize || 0), 0);
    setStorageInfo(t("settings.storage", { count: tracks.length, size: formatFileSize(totalBytes, language) }));
  };

  // 进入设置页自动刷新一次存储空间信息，仍可点击行手动刷新
  useEffect(() => {
    void checkStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Section title={t("settings.language")} colors={colors}>
        <View style={styles.languageChoices}>
          {(["system", "zh-CN", "en"] as const).map((option) => {
            const selected = preference === option;
            const label = t(`settings.${option === "zh-CN" ? "chinese" : option === "en" ? "english" : "system"}`);
            return (
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                style={[styles.languageButton, selected && { backgroundColor: colors.tint }]}
                onPress={() => void setLanguage(option)}
              >
                <Text numberOfLines={1} style={[styles.languageText, { color: selected ? colors.tintText : colors.secondaryText }]}>{label}</Text>
              </Touchable>
            );
          })}
        </View>
      </Section>

      <Section title={t("settings.checkStorage")} colors={colors}>
        <Touchable accessibilityRole="button" onPress={checkStorage} style={styles.settingRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="folder-outline" size={20} color={colors.tint} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t("settings.checkStorage")}</Text>
            <Text numberOfLines={1} style={[styles.rowDetail, { color: colors.secondaryText }]}>{storageInfo || t("settings.storage", { count: 0, size: formatFileSize(0, language) })}</Text>
          </View>
        </Touchable>
      </Section>

      <Section title={t("settings.about")} colors={colors}>
        <View style={styles.aboutHeader}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="play-circle" size={20} color={colors.tint} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: colors.primaryText }]}>TubeCast</Text>
            <Text style={[styles.rowDetail, { color: colors.secondaryText }]}>{t("settings.description")}</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.settingRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="server-outline" size={20} color={colors.tint} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: colors.primaryText }]}>API</Text>
            <Text numberOfLines={1} style={[styles.rowDetail, { color: colors.secondaryText }]}>{SERVER_URL}</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <Touchable accessibilityRole="link" onPress={() => void Linking.openURL("https://github.com/Tomyail/tubecast")} style={styles.settingRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="logo-github" size={20} color={colors.tint} /></View>
          <Text style={[styles.rowTitle, { color: colors.tint }]}>{t("settings.source")}</Text>
          <Ionicons name="arrow-up-right-box" size={18} color={colors.tint} />
        </Touchable>
      </Section>
    </Screen>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useAppTheme>["colors"]; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{title}</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View></View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { color: "#6f6256", fontSize: 13, fontWeight: "600", paddingHorizontal: 4, textTransform: "uppercase" },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  languageChoices: { flexDirection: "row", gap: 8, padding: 10 },
  languageButton: { alignItems: "center", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 8 },
  languageText: { color: "#6f6256", fontSize: 14 },
  settingRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  aboutHeader: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { alignItems: "center", borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { color: "#241a12", flex: 1, fontSize: 16, fontWeight: "600" },
  rowDetail: { color: "#85776a", fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
