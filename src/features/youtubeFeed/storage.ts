import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FeedSource } from "./types";

const STORAGE_KEY = "youtube_subscriptions";

export async function getSubscribedChannels(): Promise<FeedSource[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveChannels(channels: FeedSource[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

export async function addChannel(channel: FeedSource): Promise<void> {
  const channels = await getSubscribedChannels();
  if (channels.some((c) => c.platform === channel.platform && c.platformSourceId === channel.platformSourceId)) {
    throw new Error("already subscribed to this channel");
  }
  channels.push(channel);
  await saveChannels(channels);
}

export async function removeChannel(platformSourceId: string): Promise<void> {
  const channels = await getSubscribedChannels();
  await saveChannels(channels.filter((c) => c.platformSourceId !== platformSourceId));
}

export async function isChannelSubscribed(platformSourceId: string): Promise<boolean> {
  const channels = await getSubscribedChannels();
  return channels.some((c) => c.platformSourceId === platformSourceId);
}
