import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

declare const __DEV__: boolean;

const KEYS = {
  serverUrl: "settings_serverUrl",
  authToken: "settings_authToken",
  deviceId: "settings_deviceId",
  youtubeApiKey: "settings_youtubeApiKey",
};

export async function getServerUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEYS.serverUrl);
  if (stored) return stored;
  return __DEV__ ? process.env.EXPO_PUBLIC_DEV_SERVER_URL || "" : "";
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.serverUrl, url);
}

export async function getAuthToken(): Promise<string> {
  const stored = await SecureStore.getItemAsync(KEYS.authToken);
  if (stored) return stored;
  return __DEV__ ? process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN || "" : "";
}

export async function setAuthToken(token: string): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(KEYS.authToken, token);
  } else {
    await SecureStore.deleteItemAsync(KEYS.authToken);
  }
}

export async function getYouTubeApiKey(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.youtubeApiKey)) || "";
}

export async function setYouTubeApiKey(key: string): Promise<void> {
  if (key) {
    await AsyncStorage.setItem(KEYS.youtubeApiKey, key);
  } else {
    await AsyncStorage.removeItem(KEYS.youtubeApiKey);
  }
}

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}
