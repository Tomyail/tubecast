import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
  ) : (
    <View style={styles.staticContent}>{children}</View>
  );

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4ede2",
  },
  scrollContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 120,
    paddingTop: 12,
  },
  staticContent: {
    flex: 1,
    gap: 16,
    padding: 18,
    paddingBottom: 120,
    paddingTop: 12,
  },
});
