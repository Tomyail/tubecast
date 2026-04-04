import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeBaseUrl } from "../../api";
import type { ServerConfig } from "../../types";
import { DEFAULT_SERVER_CONFIG, loadServerConfig, saveServerConfig } from "./storage";

type SettingsContextValue = {
  isLoaded: boolean;
  serverConfig: ServerConfig;
  normalizedBaseUrl: string;
  hasServerConfig: boolean;
  updateServerConfig: (config: Pick<ServerConfig, "baseUrl" | "authToken">) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverConfig, setServerConfig] = useState<ServerConfig>(DEFAULT_SERVER_CONFIG);

  useEffect(() => {
    let isMounted = true;

    void loadServerConfig().then((config) => {
      if (!isMounted) {
        return;
      }

      setServerConfig(config);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const normalizedBaseUrl = normalizeBaseUrl(serverConfig.baseUrl);

    return {
      isLoaded,
      serverConfig,
      normalizedBaseUrl,
      hasServerConfig: normalizedBaseUrl.length > 0,
      updateServerConfig: async (config) => {
        const nextConfig = {
          ...serverConfig,
          ...config,
        };
        setServerConfig(nextConfig);
        await saveServerConfig(nextConfig);
      },
    };
  }, [isLoaded, serverConfig]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useServerConfig() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useServerConfig must be used within SettingsProvider");
  }

  return context;
}
