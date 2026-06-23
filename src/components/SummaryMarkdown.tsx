import { StyleSheet, View } from "react-native";
import StreamdownRN from "streamdown-rn";

export default function SummaryMarkdown({
  content,
  isComplete,
}: {
  content: string;
  isComplete: boolean;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StreamdownRN
        isComplete={isComplete}
        style={styles.markdown}
        theme="light"
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
