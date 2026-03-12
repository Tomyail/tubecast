import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useServerConfig } from "../features/settings/context";

export default function SettingsScreen() {
  const { isLoaded, normalizedBaseUrl, serverConfig, updateServerConfig } = useServerConfig();
  const [baseUrl, setBaseUrl] = useState(serverConfig.baseUrl);
  const [authToken, setAuthToken] = useState(serverConfig.authToken);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtitle}>把后端连接配置从主流程挪出来，后续这里再补连通性检测和缓存管理。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Base URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={setBaseUrl}
          placeholder="http://192.168.1.100:3000"
          placeholderTextColor="#8b8478"
          style={styles.input}
          value={baseUrl}
        />
        <Text style={styles.label}>Bearer Token</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setAuthToken}
          placeholder="Optional AUTH_TOKEN"
          placeholderTextColor="#8b8478"
          style={styles.input}
          value={authToken}
        />
        <Pressable
          disabled={!isLoaded}
          style={styles.button}
          onPress={() => {
            void updateServerConfig({ baseUrl, authToken }).then(() => {
              Alert.alert("已保存", "服务端配置已更新。");
            });
          }}
        >
          <Text style={styles.buttonText}>保存配置</Text>
        </Pressable>
        <Text style={styles.helperText}>当前生效地址：{normalizedBaseUrl || "未配置"}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    color: "#241a12",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6f6256",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff9f3",
    borderColor: "#d8c9b8",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  label: {
    color: "#5f4c3f",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f6eee2",
    borderColor: "#dac8b1",
    borderRadius: 18,
    borderWidth: 1,
    color: "#1f1812",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#b65a36",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#fff7ef",
    fontSize: 16,
    fontWeight: "800",
  },
  helperText: {
    color: "#6f6256",
    fontSize: 13,
    lineHeight: 19,
  },
});
