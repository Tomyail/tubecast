import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getYouTubeApiKey, setYouTubeApiKey } from "./storage";

type Settings = {
  youtubeApiKey: string;
};

type SettingsContextValue = {
  isLoaded: boolean;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>({ youtubeApiKey: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ytKey = await getYouTubeApiKey();
      if (mounted) {
        setSettings({ youtubeApiKey: ytKey });
        setIsLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({
    isLoaded,
    settings,
    updateSettings: async (partial) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      if (partial.youtubeApiKey !== undefined) await setYouTubeApiKey(next.youtubeApiKey);
    },
  }), [settings, isLoaded]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
