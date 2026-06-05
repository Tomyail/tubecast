import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Settings = Record<string, never>;

type SettingsContextValue = {
  isLoaded: boolean;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) {
        setSettings({});
        setIsLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({
    isLoaded,
    settings,
    updateSettings: async () => {
      setSettings({});
    },
  }), [settings, isLoaded]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
