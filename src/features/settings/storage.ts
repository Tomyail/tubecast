import AsyncStorage from "@react-native-async-storage/async-storage";

export const SERVER_URL = "https://yt-audio.tomyail.com";

const KEYS = {
  deviceId: "settings_deviceId",
};

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}
