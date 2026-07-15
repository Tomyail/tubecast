import AsyncStorage from "@react-native-async-storage/async-storage";

const PROMPT_SEEN_KEY = "app_store_migration_prompt_seen_v1";

export async function hasSeenAppStoreMigrationPrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(PROMPT_SEEN_KEY)) === "true";
}

export async function markAppStoreMigrationPromptSeen(): Promise<void> {
  await AsyncStorage.setItem(PROMPT_SEEN_KEY, "true");
}
