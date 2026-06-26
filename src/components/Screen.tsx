import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayer } from "../features/player/context";
import { useAppTheme } from "../app/theme";

const BOTTOM_WITH_PLAYER = 120;
const BOTTOM_BASE = 24;

export default function Screen({
  children,
  reserveMiniPlayerSpace = true,
  scroll = true,
}: {
  children: ReactNode;
  reserveMiniPlayerSpace?: boolean;
  scroll?: boolean;
}) {
  const { activeTrack } = usePlayer();
  const { colors } = useAppTheme();
  const paddingBottom = reserveMiniPlayerSpace && activeTrack ? BOTTOM_WITH_PLAYER : BOTTOM_BASE;

  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom }]}>{children}</ScrollView>
  ) : (
    <View style={[styles.staticContent, { paddingBottom }]}>{children}</View>
  );

  return <SafeAreaView edges={["left", "right"]} style={[styles.safeArea, { backgroundColor: colors.background }]}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 18,
    paddingTop: 12,
  },
  staticContent: {
    flex: 1,
    gap: 16,
    padding: 18,
    paddingTop: 12,
  },
});
