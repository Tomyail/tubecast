export type AppThemePreference = "system" | "light" | "dark";

// 将用户的主题偏好解析为具体的深/浅色决策。
// 与 i18n/resolveLanguage 对称:纯函数独立成模块,便于在不加载 react-native 的情况下单测
// (provider 见 theme.tsx)。systemScheme 是实时的系统配色(useColorScheme());
// 当偏好为 "system" 时结果随它变化,因此 app 能实时跟随系统外观切换。
export function resolveTheme(preference: AppThemePreference, systemScheme?: string | null): boolean {
  if (preference === "light") return false;
  if (preference === "dark") return true;
  return (systemScheme ?? null) === "dark";
}
