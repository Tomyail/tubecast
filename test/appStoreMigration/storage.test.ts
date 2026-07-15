import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  },
}));

import { hasSeenAppStoreMigrationPrompt, markAppStoreMigrationPromptSeen } from "../../src/features/appStoreMigration/storage";

describe("App Store migration prompt storage", () => {
  beforeEach(() => values.clear());

  it("is unseen by default", async () => {
    await expect(hasSeenAppStoreMigrationPrompt()).resolves.toBe(false);
  });

  it("remembers that the user made a choice", async () => {
    await markAppStoreMigrationPromptSeen();
    await expect(hasSeenAppStoreMigrationPrompt()).resolves.toBe(true);
  });
});
