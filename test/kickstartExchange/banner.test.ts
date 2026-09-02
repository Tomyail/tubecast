import { describe, expect, it } from "vitest";
import { KICKSTART_BANNER_NATIVE_HEIGHT } from "../../src/features/kickstartExchange/layout";

// Kickstart banner 现以 inline 形式渲染在 Settings 的 ScrollView 中，
// 唯一的布局 seam 是 SDK 原生固定高度，不再有全局 bottom 定位计算。
describe("kickstart banner inline layout", () => {
  it("reserves the SDK's fixed native height", () => {
    expect(KICKSTART_BANNER_NATIVE_HEIGHT).toBe(164);
  });
});
