import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { resources } from "./translations";

export type AppLanguage = "system" | "en" | "zh-CN";
export type ResolvedLanguage = Exclude<AppLanguage, "system">;
const LANGUAGE_KEY = "settings_language";

export function resolveLanguage(preference: AppLanguage, systemTag?: string): ResolvedLanguage {
  if (preference === "en" || preference === "zh-CN") return preference;
  const tag = systemTag ?? Localization.getLocales()[0]?.languageTag ?? "en";
  return /^zh(?:-|$)/i.test(tag) ? "zh-CN" : "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

type I18nContextValue = { preference: AppLanguage; language: ResolvedLanguage; setLanguage: (language: AppLanguage) => Promise<void> };
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppLanguage>("system");
  const [ready, setReady] = useState(false);
  const language = resolveLanguage(preference);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      const next: AppLanguage = stored === "en" || stored === "zh-CN" || stored === "system" ? stored : "system";
      setPreference(next);
      return i18n.changeLanguage(resolveLanguage(next));
    }).finally(() => setReady(true));
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    preference,
    language,
    setLanguage: async (next) => {
      await AsyncStorage.setItem(LANGUAGE_KEY, next);
      setPreference(next);
      await i18n.changeLanguage(resolveLanguage(next));
    },
  }), [preference, language]);

  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useAppLanguage() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useAppLanguage must be used within I18nProvider");
  return context;
}

export { useTranslation };
