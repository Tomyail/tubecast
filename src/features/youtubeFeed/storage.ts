import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SubscribedChannel } from "./types";

const STORAGE_KEY = "youtube_subscriptions";

export async function getSubscribedChannels(): Promise<SubscribedChannel[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveChannels(channels: SubscribedChannel[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

export async function addChannel(channel: SubscribedChannel): Promise<void> {
  const channels = await getSubscribedChannels();
  if (channels.some((c) => c.id === channel.id)) {
    throw new Error("already subscribed to this channel");
  }
  channels.push(channel);
  await saveChannels(channels);
}

export async function removeChannel(channelId: string): Promise<void> {
  const channels = await getSubscribedChannels();
  await saveChannels(channels.filter((c) => c.id !== channelId));
}

export async function isChannelSubscribed(channelId: string): Promise<boolean> {
  const channels = await getSubscribedChannels();
  return channels.some((c) => c.id === channelId);
}
