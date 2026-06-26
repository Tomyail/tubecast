import type { PressableProps } from "react-native";
import { Pressable } from "react-native";

// 全局可按压反馈封装：按下时半透明（disabled 时不触发）。
// 透明地转发所有 PressableProps，兼容 style 为对象/数组/函数的三种写法，
// 仅在原 style 基础上叠加 pressed 态透明度。
export default function Touchable({ style, disabled, children, ...rest }: PressableProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed && !disabled && { opacity: 0.55 },
      ]}
    >
      {children}
    </Pressable>
  );
}
