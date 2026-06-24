import { StyleSheet, View } from "react-native";
import StreamdownRN from "streamdown-rn";
import { useAppTheme } from "../app/theme";

export default function SummaryMarkdown({
  content,
  isComplete,
}: {
  content: string;
  isComplete: boolean;
}) {
  const { isDark } = useAppTheme();
  if (!content.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StreamdownRN
        isComplete={isComplete}
        style={styles.markdown}
        theme={isDark ? "dark" : "light"}
      >
        {content}
      </StreamdownRN>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 24,
  },
  markdown: {
    backgroundColor: "transparent",
  },
});
