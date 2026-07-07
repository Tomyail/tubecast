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
  background: "#f7f1e8", surface: "#fffaf3", elevatedSurface: "#eee7dd",
  primaryText: "#201913", secondaryText: "#766b60", border: "#e2d7ca",
  tint: "#b85f3b", tintText: "#fffaf3", success: "#4f8a61", destructive: "#b42318", destructiveSurface: "#fde8e7",
};

const dark: AppColors = {
  background: "#15120f", surface: "#201c18", elevatedSurface: "#302922",
  primaryText: "#f8efe6", secondaryText: "#c5b7a9", border: "#44392f",
  tint: "#dc815d", tintText: "#24140f", success: "#8fd49e", destructive: "#ffb4ab", destructiveSurface: "#3a2422",
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
