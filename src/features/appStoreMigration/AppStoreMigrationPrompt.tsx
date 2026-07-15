import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../app/theme";
import Touchable from "../../components/Touchable";
import { useTranslation } from "../../i18n";
import { appStoreCampaignUrl } from "./config";
import { hasSeenAppStoreMigrationPrompt, markAppStoreMigrationPromptSeen } from "./storage";

export default function AppStoreMigrationPrompt() {
  const [visible, setVisible] = useState(false);
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;

    if (!appStoreCampaignUrl) return () => { active = false; };

    void hasSeenAppStoreMigrationPrompt()
      .then((seen) => {
        if (active && !seen) setVisible(true);
      })
      .catch(() => {
        // A storage failure should not block app startup or repeatedly interrupt the user.
      });

    return () => { active = false; };
  }, []);

  const dismiss = () => {
    setVisible(false);
    void markAppStoreMigrationPromptSeen().catch(() => {
      // The explicit choice still takes effect for this session if persistence fails.
    });
  };

  const openStableVersion = async () => {
    if (!appStoreCampaignUrl) return;

    dismiss();
    try {
      await Linking.openURL(appStoreCampaignUrl);
    } catch {
      Alert.alert(t("appStoreMigration.openFailedTitle"), t("appStoreMigration.openFailedMessage"));
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.elevatedSurface }]}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.tint} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.primaryText }]}>
            {t("appStoreMigration.title")}
          </Text>
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            {t("appStoreMigration.message")}
          </Text>
          <View style={styles.actions}>
            <Touchable
              accessibilityHint={t("appStoreMigration.stableHint")}
              accessibilityRole="link"
              onPress={() => void openStableVersion()}
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.tintText }]}>
                {t("appStoreMigration.useStable")}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.tintText} />
            </Touchable>
            <Touchable accessibilityRole="button" onPress={dismiss} style={styles.secondaryButton}>
              <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
                {t("appStoreMigration.continueTesting")}
              </Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  icon: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    marginBottom: 16,
    width: 56,
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" },
  actions: { gap: 4, marginTop: 22, width: "100%" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700" },
  secondaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 16, fontWeight: "600" },
});
