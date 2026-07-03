import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { SERVER_URL } from "../settings/storage";

export type RemoteConfig = {
  linkProcessingEnabled: boolean;
  audioExportEnabled: boolean;
};

const DEFAULT_CONFIG: RemoteConfig = {
  linkProcessingEnabled: true,
  audioExportEnabled: true,
};

const FALLBACK_MOBILE_CONFIG_URL = `${SERVER_URL.replace(/\/+$/, "")}/api/mobile-config`;

export const MOBILE_CONFIG_URL =
  process.env.EXPO_PUBLIC_MOBILE_CONFIG_URL ??
  FALLBACK_MOBILE_CONFIG_URL;

const RemoteConfigContext = createContext<RemoteConfig>(DEFAULT_CONFIG);

export function RemoteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      for (const url of getMobileConfigUrls()) {
        const next = await fetchRemoteConfig(url);
        if (cancelled) return;
        if (next) {
          setConfig(next);
          return;
        }
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => config, [config]);
  return <RemoteConfigContext.Provider value={value}>{children}</RemoteConfigContext.Provider>;
}

export function useRemoteConfig(): RemoteConfig {
  return useContext(RemoteConfigContext);
}

export function getMobileConfigUrls(): string[] {
  return Array.from(new Set([MOBILE_CONFIG_URL, FALLBACK_MOBILE_CONFIG_URL]));
}

export async function fetchRemoteConfig(url: string): Promise<RemoteConfig | null> {
  try {
    const response = await fetch(withCacheBust(url), {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) return null;
    return parseRemoteConfig(await response.json());
  } catch {
    // Keep trying other URLs; provider falls back to built-in defaults if all fail.
    return null;
  }
}

export function parseRemoteConfig(payload: unknown): RemoteConfig | null {
  if (!payload || typeof payload !== "object") return null;
  const features = (payload as { features?: unknown }).features;
  if (!features || typeof features !== "object") return null;
  return {
    linkProcessingEnabled: parseBoolean(
      (features as { linkProcessingEnabled?: unknown }).linkProcessingEnabled,
      DEFAULT_CONFIG.linkProcessingEnabled,
    ),
    audioExportEnabled: parseBoolean(
      (features as { audioExportEnabled?: unknown }).audioExportEnabled,
      DEFAULT_CONFIG.audioExportEnabled,
    ),
  };
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function withCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}
