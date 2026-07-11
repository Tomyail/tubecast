/**
 * commitlint 配置（第 2 层：格式强制）。
 *
 * 配合 commit-type-guard.mjs（第 3 层：按文件路径校验类型）一起在
 * .husky/commit-msg 钩子里运行。
 *
 * 版本号 bump 由 commit-and-tag-version 决定（见 .versionrc）：
 *   feat          → minor   (1.0.0 → 1.1.0)
 *   fix / perf    → patch   (1.0.0 → 1.0.1)
 *   其他 type     → 不 bump
 * 所以"工具链改动误用 feat"会把用户可见的版本号顶高——这正是本配置 +
 * type-guard 要拦的。
 *
 * @type {import('@commitlint/types').UserConfig}
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 用户可感知的新功能（必须改了 app 源码：src/ App.tsx assets/ ios-share-extension/ …）
        "fix", // bug 修复（app 源码）
        "perf", // 性能优化（不改变外部行为）
        "refactor", // 重构（不改变外部行为）
        "revert", // 回滚某个提交
        "docs", // 文档
        "style", // 代码风格（格式、空白、分号……不影响运行）
        "test", // 测试相关
        "build", // 构建系统 / 依赖 / 发版脚本 / fastlane / expo prebuild 配置
        "ci", // CI 配置（.github/workflows 等）
        "chore", // 杂项 / 不属于以上任何类别
      ],
    ],
    // 允许中文 / 大写开头的主语（subject-case 默认强制全小写，对中文不友好）
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
  // 放过合并 / 自动化提交，避免误伤
  ignores: [
    (msg) => /^Merge (branch|pull request|tag|remote)/.test(msg),
    (msg) => /^Revert "/.test(msg),
    (msg) => /^Initial commit/.test(msg),
  ],
};
