import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SettingsProvider } from "../../features/settings/context";
import { PlaylistProvider } from "../../features/playlist/context";
import { PlayerProvider } from "../../features/player/context";
import { I18nProvider } from "../../i18n";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <SettingsProvider>
              <PlaylistProvider>
                <PlayerProvider>{children}</PlayerProvider>
              </PlaylistProvider>
            </SettingsProvider>
          </I18nProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
