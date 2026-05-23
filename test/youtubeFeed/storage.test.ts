import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SubscribedChannel } from "../../src/features/youtubeFeed/types";

// Mock AsyncStorage before importing the module under test
const store: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (key: string) => Promise.resolve(store[key] || null),
    setItem: (key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      delete store[key];
      return Promise.resolve();
    },
  },
}));

// Use dynamic import after mock setup
const { getSubscribedChannels, addChannel, removeChannel, isChannelSubscribed } = await import(
  "../../src/features/youtubeFeed/storage"
);

const makeChannel = (overrides: Partial<SubscribedChannel> = {}): SubscribedChannel => ({
  id: "UC_test123",
  title: "Test Channel",
  thumbnailUrl: "https://example.com/thumb.jpg",
  uploadsPlaylistId: "UU_test123",
  addedAt: "2026-05-23T00:00:00Z",
  ...overrides,
});

describe("youtubeFeed storage", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("returns empty array when no channels stored", async () => {
    const channels = await getSubscribedChannels();
    expect(channels).toEqual([]);
  });

  it("adds and retrieves a channel", async () => {
    const channel = makeChannel();
    await addChannel(channel);
    const channels = await getSubscribedChannels();
    expect(channels).toEqual([channel]);
  });

  it("prevents duplicate channel by id", async () => {
    const channel = makeChannel();
    await addChannel(channel);
    await expect(addChannel(channel)).rejects.toThrow("already subscribed");
  });

  it("removes a channel by id", async () => {
    const ch1 = makeChannel({ id: "UC_a" });
    const ch2 = makeChannel({ id: "UC_b", title: "Channel B" });
    await addChannel(ch1);
    await addChannel(ch2);
    await removeChannel("UC_a");
    const channels = await getSubscribedChannels();
    expect(channels).toEqual([ch2]);
  });

  it("checks if channel is subscribed", async () => {
    await addChannel(makeChannel());
    expect(await isChannelSubscribed("UC_test123")).toBe(true);
    expect(await isChannelSubscribed("UC_other")).toBe(false);
  });
});
