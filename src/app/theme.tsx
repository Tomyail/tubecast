import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

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
};

const light: AppColors = {
  background: "#f4ede2", surface: "#fff9f3", elevatedSurface: "#eee6dc",
  primaryText: "#241a12", secondaryText: "#6f6256", border: "#d8c9b8",
  tint: "#b65a36", tintText: "#fff9f3", success: "#4f8a61", destructive: "#b42318",
};

const dark: AppColors = {
  background: "#171411", surface: "#231e1a", elevatedSurface: "#342c26",
  primaryText: "#f7eee6", secondaryText: "#c4b5a7", border: "#4a3e35",
  tint: "#e68a64", tintText: "#24140f", success: "#8fd49e", destructive: "#ffb4ab",
};

const ThemeContext = createContext<{ colors: AppColors; isDark: boolean }>({ colors: light, isDark: false });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useColorScheme() === "dark";
  const value = useMemo(() => ({ colors: isDark ? dark : light, isDark }), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
