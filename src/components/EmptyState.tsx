import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../app/theme";
import Touchable from "./Touchable";

type IoniconName = NonNullable<ComponentProps<typeof Ionicons>["name"]>;

// 统一空状态模板：图标 + 标题 + 说明（可选）+ CTA 按钮（可选）。
// 垂直居中，调用方通常用 flex:1 的容器包裹以实现整屏居中。
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: IoniconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={36} color={colors.secondaryText} />
      <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.secondaryText }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Touchable
          accessibilityRole="button"
          style={[styles.cta, { backgroundColor: colors.tint }]}
          onPress={onAction}
        >
          <Text style={[styles.ctaText, { color: colors.tintText }]}>{actionLabel}</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, textAlign: "center" },
  cta: { minHeight: 44, borderRadius: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 16, fontWeight: "600" },
});
