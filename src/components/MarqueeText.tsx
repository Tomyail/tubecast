import { useEffect, useState } from "react";
import { Text, View, type LayoutChangeEvent, type TextProps } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { getCurrentTextWidth, getMarqueeLayout, type MarqueeMeasurement } from "./marqueeLayout";

type MarqueeTextProps = {
  text: string;
  style?: TextProps["style"];
  /** 滚动速度 px/秒,默认 30 */
  speed?: number;
};

// 标题走马灯:文本超出容器时,两份文本拼接连续向左滚动(第二份接上第一份),无缝循环。
// 不超出则静止左对齐。滚动跑在 reanimated 的 UI 线程,不阻塞 JS。
export default function MarqueeText({ text, style, speed = 30 }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [measurement, setMeasurement] = useState<MarqueeMeasurement | null>(null);
  const translateX = useSharedValue(0);
  const measuredTextWidth = getCurrentTextWidth(measurement, text);
  const layout = getMarqueeLayout({ containerWidth, textWidth: measuredTextWidth, speed });

  useEffect(() => {
    if (layout.shouldScroll) {
      // 两份文本拼接的连续 marquee:滚过一份(+间距)后,第二份正好接上第一份原位置,
      // 无缝循环,方向恒定向左(不会出现反向跳回)。
      cancelAnimation(translateX);
      translateX.value = 0;
      translateX.value = withRepeat(
        withTiming(-layout.distance, { duration: layout.duration, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(translateX);
      translateX.value = 0;
    }
  }, [layout.distance, layout.duration, layout.shouldScroll, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{ overflow: "hidden" }}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View
        key={`measure-${text}`}
        pointerEvents="none"
        style={{ alignItems: "flex-start", flexDirection: "row", opacity: 0, position: "absolute", width: 9999 }}
      >
        <Text
          style={style}
          numberOfLines={1}
          onLayout={(e: LayoutChangeEvent) => setMeasurement({ text, width: e.nativeEvent.layout.width })}
        >
          {text}
        </Text>
      </View>
      {layout.shouldScroll ? (
        <>
          {/* 占位:撑起容器高度,不可见。 */}
          <Text style={[style, { opacity: 0 }]} numberOfLines={1}>
            {text}
          </Text>
          <Animated.View
            style={[
              { position: "absolute", left: 0, top: 0, flexDirection: "row", alignItems: "flex-start" },
              animatedStyle,
            ]}
          >
            <Text style={[style, { width: layout.itemWidth }]} numberOfLines={1} ellipsizeMode="clip">
              {text}
            </Text>
            <Text style={[style, { marginLeft: layout.gap, width: layout.itemWidth }]} numberOfLines={1} ellipsizeMode="clip">
              {text}
            </Text>
          </Animated.View>
        </>
      ) : (
        <Text style={style} numberOfLines={1} ellipsizeMode="tail">
          {text}
        </Text>
      )}
    </View>
  );
}
