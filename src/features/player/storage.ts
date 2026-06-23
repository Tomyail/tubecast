import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAYBACK_PROGRESS_KEY = "ytAudio.playbackProgress";

type PlaybackProgressStore = Record<string, number>;

async function loadStore(): Promise<PlaybackProgressStore> {
  const raw = await AsyncStorage.getItem(PLAYBACK_PROGRESS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as PlaybackProgressStore : {};
  } catch {
    return {};
  }
}

async function saveStore(store: PlaybackProgressStore) {
  await AsyncStorage.setItem(PLAYBACK_PROGRESS_KEY, JSON.stringify(store));
}

export async function loadPlaybackProgress(key: string | null) {
  if (!key) {
    return 0;
  }

  const store = await loadStore();
  const value = store[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function savePlaybackProgress(key: string | null, seconds: number) {
  if (!key) {
    return;
  }

  const store = await loadStore();
  if (seconds <= 0) {
    delete store[key];
  } else {
    store[key] = seconds;
  }

  await saveStore(store);
}
