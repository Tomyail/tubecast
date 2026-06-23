import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useAddChannel } from "../features/youtubeFeed/hooks";
import type { FeedSource } from "../features/youtubeFeed/types";
import { useTranslation } from "../i18n";

type Props = {
  onAdded: () => void;
  onClose: () => void;
};

export default function AddChannelScreen({ onAdded, onClose }: Props) {
  const { t } = useTranslation();
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
    onAdded();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Text style={styles.closeText}>{t("common.cancel")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("channel.title")}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t("channel.placeholder")}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          style={[styles.resolveButton, !input.trim() && styles.disabled]}
          onPress={handleResolve}
          disabled={!input.trim() || addChannel.isPending}
        >
          {addChannel.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.resolveText}>{t("channel.add")}</Text>}
        </Pressable>
      </View>

      {parseError && <Text style={styles.errorText}>{parseError}</Text>}

      {preview && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{t("channel.preview")}</Text>
          <Text style={styles.previewTitle}>{preview.title}</Text>
          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>{t("common.done")}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  closeText: { fontSize: 16, color: "#b65a36" },
  title: { fontSize: 20, fontWeight: "bold" },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  resolveButton: { backgroundColor: "#FF6B35", paddingHorizontal: 20, justifyContent: "center", borderRadius: 8 },
  resolveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  errorText: { color: "red", fontSize: 14, marginBottom: 8 },
  preview: { marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#dbcbb9" },
  previewLabel: { fontSize: 13, color: "#888" },
  previewTitle: { fontSize: 18, fontWeight: "600", marginTop: 4, marginBottom: 12 },
  confirmButton: { backgroundColor: "#4CAF50", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
