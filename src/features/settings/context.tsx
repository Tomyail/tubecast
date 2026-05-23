import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getServerUrl, setServerUrl, getAuthToken, setAuthToken, getYouTubeApiKey, setYouTubeApiKey } from "./storage";

type Settings = {
  serverUrl: string;
  authToken: string;
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
  const [settings, setSettings] = useState<Settings>({ serverUrl: "", authToken: "", youtubeApiKey: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [url, token, ytKey] = await Promise.all([getServerUrl(), getAuthToken(), getYouTubeApiKey()]);
      if (mounted) {
        setSettings({ serverUrl: url, authToken: token, youtubeApiKey: ytKey });
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
      if (partial.serverUrl !== undefined) await setServerUrl(next.serverUrl);
      if (partial.authToken !== undefined) await setAuthToken(next.authToken);
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
