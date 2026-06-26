import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { resolveTheme, type AppThemePreference } from "./theme-preference";

export type AppColors = {
  background: string;
  surface: string;
  elevatedSurface: string;
  primaryText: string;
  secondaryText: string;
  border: string;
  tint: string;
  tintText: string;
  success: string;
  destructive: string;
  destructiveSurface: string;
};

const light: AppColors = {
  background: "#f4ede2", surface: "#fff9f3", elevatedSurface: "#eee6dc",
  primaryText: "#241a12", secondaryText: "#6f6256", border: "#d8c9b8",
  tint: "#b65a36", tintText: "#fff9f3", success: "#4f8a61", destructive: "#b42318", destructiveSurface: "#fde8e7",
};

const dark: AppColors = {
  background: "#171411", surface: "#231e1a", elevatedSurface: "#342c26",
  primaryText: "#f7eee6", secondaryText: "#c4b5a7", border: "#4a3e35",
  tint: "#e68a64", tintText: "#24140f", success: "#8fd49e", destructive: "#ffb4ab", destructiveSurface: "#3a2422",
};

// 设计 token：字号 / 间距 / 圆角 scale。从既有 magic number 归纳而来，
// 供新代码与渐进迁移使用；旧 StyleSheet 中的 magic number 暂保留，避免一次性大diff。
// token 是静态的（不随明暗主题变化），故作为独立常量导出而非放进 context。
export const typography = {
  caption: 12, // 辅助/元信息
  body: 14, // 正文
  bodyLg: 16, // 正文强调 / 行内按钮
  title: 17, // 卡片/行标题
  titleLg: 20, // 区块大标题
  headline: 22, // 屏幕级标题
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

const THEME_KEY = "settings_theme";

type ThemeContextValue = {
  colors: AppColors;
  isDark: boolean;
  preference: AppThemePreference;
  setTheme: (next: AppThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  isDark: false,
  preference: "system",
  setTheme: async () => {},
});

// 偏好的持久化与解析对标 i18n/I18nProvider:system 为默认乐观初值(避免启动白屏),
// AsyncStorage 读到存储值后再修正;system 模式下 isDark 随 useColorScheme() 实时变化。
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<AppThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setPreference(stored);
    });
  }, []);

  const isDark = resolveTheme(preference, systemScheme);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: isDark ? dark : light,
    isDark,
    preference,
    setTheme: async (next) => {
      await AsyncStorage.setItem(THEME_KEY, next);
      setPreference(next);
    },
  }), [isDark, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
