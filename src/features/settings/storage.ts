import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ServerConfig } from "../../types";

const SERVER_CONFIG_KEY = "ytAudio.serverConfig";

function createDeviceId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timestampPart = Date.now().toString(36);
  return `anon-${timestampPart}-${randomPart}`;
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  baseUrl: "http://192.168.1.100:3000",
  authToken: "",
  deviceId: createDeviceId(),
};

export async function loadServerConfig() {
  const raw = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
  if (!raw) {
    return DEFAULT_SERVER_CONFIG;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ServerConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_SERVER_CONFIG.baseUrl,
      authToken: typeof parsed.authToken === "string" ? parsed.authToken : DEFAULT_SERVER_CONFIG.authToken,
      deviceId: typeof parsed.deviceId === "string" && parsed.deviceId.trim()
        ? parsed.deviceId.trim()
        : createDeviceId(),
    };
  } catch {
    return DEFAULT_SERVER_CONFIG;
  }
}

export async function saveServerConfig(config: ServerConfig) {
  await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
}
