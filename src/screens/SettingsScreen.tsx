import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import appConfig from "../../app.json";
import Screen from "../components/Screen";
import Touchable from "../components/Touchable";
import { getAllTracks } from "../features/playlist/storage";
import { formatFileSize } from "../i18n/formatters";
import { useAppLanguage, useTranslation } from "../i18n";
import { useAppTheme } from "../app/theme";
import { appStoreCampaignUrl } from "../features/appStoreMigration/config";

type BuildExtra = {
  buildCommit?: string;
};
type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

const expoConfig = Constants.expoConfig;
const buildExtra = expoConfig?.extra as BuildExtra | undefined;
const appVersion = expoConfig?.version ?? appConfig.expo.version;
const buildNumber = expoConfig?.ios?.buildNumber ?? appConfig.expo.ios.buildNumber;
const buildCommit = buildExtra?.buildCommit ?? "unknown";
const displayCommit = buildCommit === "unknown" ? buildCommit : buildCommit.slice(0, 12);
const buildInfo = `v${appVersion} (${buildNumber}) · ${displayCommit}`;
const sourceUrl =
  buildCommit === "unknown"
    ? "https://github.com/Tomyail/tubecast"
    : `https://github.com/Tomyail/tubecast/commit/${buildCommit}`;
const privacyPolicyUrl = "https://yt-audio.tomyail.com/privacy";
const termsUrl = "https://yt-audio.tomyail.com/terms";
const supportUrl = "https://yt-audio.tomyail.com/support";

export default function SettingsScreen() {
  const [storageInfo, setStorageInfo] = useState<string>("");
  const { t } = useTranslation();
  const { colors, preference: themePreference, setTheme } = useAppTheme();
  const { preference, language, setLanguage } = useAppLanguage();

  const checkStorage = async () => {
    const tracks = await getAllTracks();
    const totalBytes = tracks.reduce((sum, track) => sum + (track.fileSize || 0), 0);
    setStorageInfo(t("settings.storage", { count: tracks.length, size: formatFileSize(totalBytes, language) }));
  };

  const openStableVersion = async () => {
    if (!appStoreCampaignUrl) return;

    try {
      await Linking.openURL(appStoreCampaignUrl);
    } catch {
      Alert.alert(t("appStoreMigration.openFailedTitle"), t("appStoreMigration.openFailedMessage"));
    }
  };

  // 进入设置页自动刷新一次存储空间信息，仍可点击行手动刷新
  useEffect(() => {
    void checkStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Section title={t("settings.language")} colors={colors}>
        <View style={styles.choices}>
          {(["system", "zh-CN", "en"] as const).map((option) => {
            const selected = preference === option;
            const label = t(`settings.${option === "zh-CN" ? "chinese" : option === "en" ? "english" : "system"}`);
            return (
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                style={[styles.choiceButton, { borderColor: colors.border }, selected && { backgroundColor: colors.elevatedSurface, borderColor: colors.tint }]}
                onPress={() => void setLanguage(option)}
              >
                <Text numberOfLines={1} style={[styles.choiceText, { color: selected ? colors.tint : colors.secondaryText }, selected && styles.choiceTextSelected]}>{label}</Text>
              </Touchable>
            );
          })}
        </View>
      </Section>

      <Section title={t("settings.theme")} colors={colors}>
        <View style={styles.choices}>
          {(["system", "light", "dark"] as const).map((option) => {
            const selected = themePreference === option;
            return (
              <Touchable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                style={[styles.choiceButton, { borderColor: colors.border }, selected && { backgroundColor: colors.elevatedSurface, borderColor: colors.tint }]}
                onPress={() => void setTheme(option)}
              >
                <Text numberOfLines={1} style={[styles.choiceText, { color: selected ? colors.tint : colors.secondaryText }, selected && styles.choiceTextSelected]}>{t(`settings.${option}`)}</Text>
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

      {appStoreCampaignUrl ? (
        <Section title={t("settings.versionChoice")} colors={colors}>
          <Touchable accessibilityRole="link" onPress={() => void openStableVersion()} style={styles.settingRow}>
            <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="storefront-outline" size={20} color={colors.tint} /></View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t("settings.stableVersion")}</Text>
              <Text numberOfLines={2} style={[styles.rowDetail, { color: colors.secondaryText }]}>{t("settings.stableVersionDetail")}</Text>
            </View>
            <Ionicons name="arrow-up-right-box" size={18} color={colors.tint} />
          </Touchable>
        </Section>
      ) : null}

      <Section title={t("settings.about")} colors={colors}>
        <View style={styles.aboutHeader}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="play-circle" size={20} color={colors.tint} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: colors.primaryText }]}>TubeCast</Text>
            <Text style={[styles.rowDetail, { color: colors.secondaryText }]}>{t("settings.description")}</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <Touchable accessibilityRole="link" onPress={() => void Linking.openURL(sourceUrl)} style={styles.settingRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}><Ionicons name="information-circle-outline" size={20} color={colors.tint} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{t("settings.version")}</Text>
            <Text numberOfLines={1} style={[styles.rowDetail, { color: colors.secondaryText }]}>{buildInfo}</Text>
          </View>
          <Ionicons name="arrow-up-right-box" size={18} color={colors.tint} />
        </Touchable>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <LinkRow icon="shield-checkmark-outline" label={t("settings.privacyPolicy")} url={privacyPolicyUrl} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <LinkRow icon="document-text-outline" label={t("settings.terms")} url={termsUrl} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <LinkRow icon="help-circle-outline" label={t("settings.support")} url={supportUrl} colors={colors} />
      </Section>
    </Screen>
  );
}

function LinkRow({ icon, label, url, colors }: { icon: IoniconName; label: string; url: string; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  return (
    <Touchable accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={styles.settingRow}>
      <View style={[styles.rowIcon, { backgroundColor: colors.elevatedSurface }]}>
        <Ionicons name={icon} size={20} color={colors.tint} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.primaryText }]}>{label}</Text>
      </View>
      <Ionicons name="arrow-up-right-box" size={18} color={colors.tint} />
    </Touchable>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useAppTheme>["colors"]; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{title}</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View></View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { color: "#6f6256", fontSize: 13, fontWeight: "600", paddingHorizontal: 4, textTransform: "uppercase" },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  choices: { flexDirection: "row", gap: 8, padding: 10 },
  choiceButton: { alignItems: "center", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, flex: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 8 },
  choiceText: { color: "#6f6256", fontSize: 14 },
  choiceTextSelected: { fontWeight: "600" },
  settingRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  aboutHeader: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { alignItems: "center", borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { color: "#241a12", flex: 1, fontSize: 16, fontWeight: "600" },
  rowDetail: { color: "#85776a", fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
