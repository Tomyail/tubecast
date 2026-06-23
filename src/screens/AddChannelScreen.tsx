import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/types";
import Screen from "../components/Screen";
import { useAddChannel } from "../features/youtubeFeed/hooks";
import type { FeedSource } from "../features/youtubeFeed/types";
import { useTranslation } from "../i18n";

export default function AddChannelScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<FeedSource | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const addChannel = useAddChannel();

  const handleResolve = async () => {
    setParseError(null);
    setPreview(null);

    try {
      const result = await addChannel.mutateAsync({ input: input.trim() });
      setPreview(result);
    } catch {
      setParseError(t("errors.generic"));
    }
  };

  const handleConfirm = () => {
    setPreview(null);
    setInput("");
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="link-outline" size={22} color="#b65a36" />
        </View>
        <Text style={styles.introText}>{t("channel.helper")}</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>{t("channel.placeholder")}</Text>
        <TextInput
          style={styles.input}
          autoFocus
          placeholder={t("channel.placeholder")}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={() => void handleResolve()}
          returnKeyType="done"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        style={[styles.resolveButton, (!input.trim() || addChannel.isPending) && styles.disabled]}
        onPress={handleResolve}
        disabled={!input.trim() || addChannel.isPending}
      >
        {addChannel.isPending ? (
          <ActivityIndicator color="#fff9f3" />
        ) : (
          <>
            <Ionicons name="add" size={20} color="#fff9f3" />
            <Text style={styles.resolveText}>{t("channel.add")}</Text>
          </>
        )}
      </Pressable>

      {parseError && (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
          <Text style={styles.errorText}>{parseError}</Text>
        </View>
      )}

      {preview && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <View style={styles.thumbnail}>
              {preview.thumbnailUrl ? (
                <Image resizeMode="cover" source={{ uri: preview.thumbnailUrl }} style={styles.thumbnailImage} />
              ) : (
                <Ionicons name="play" size={22} color="#b65a36" />
              )}
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewLabel}>{t("channel.added")}</Text>
              <Text numberOfLines={2} style={styles.previewTitle}>{preview.title}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#4f8a61" />
          </View>
          <Pressable accessibilityRole="button" style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>{t("common.done")}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 24 },
  introIcon: { alignItems: "center", backgroundColor: "#f1dfc7", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  introText: { color: "#6f6256", flex: 1, fontSize: 15, lineHeight: 21 },
  formGroup: { gap: 8 },
  fieldLabel: { color: "#6f6256", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14 },
  resolveButton: { alignItems: "center", backgroundColor: "#b65a36", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16, minHeight: 48, paddingHorizontal: 20 },
  resolveText: { color: "#fff9f3", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  errorState: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 12 },
  errorText: { color: "#b42318", flex: 1, fontSize: 14 },
  preview: { backgroundColor: "#fff9f3", borderColor: "#d8c9b8", borderRadius: 16, borderWidth: 1, gap: 18, marginTop: 24, padding: 16 },
  previewHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  thumbnail: { alignItems: "center", backgroundColor: "#f1dfc7", borderRadius: 12, height: 56, justifyContent: "center", overflow: "hidden", width: 56 },
  thumbnailImage: { height: "100%", width: "100%" },
  previewContent: { flex: 1, gap: 3 },
  previewLabel: { color: "#6f6256", fontSize: 13, fontWeight: "600" },
  previewTitle: { color: "#241a12", fontSize: 17, fontWeight: "700", lineHeight: 22 },
  confirmButton: { alignItems: "center", borderColor: "#b65a36", borderRadius: 10, borderWidth: 1, justifyContent: "center", minHeight: 44 },
  confirmText: { color: "#8b5c48", fontSize: 16, fontWeight: "600" },
});
