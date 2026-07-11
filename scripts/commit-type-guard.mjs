#!/usr/bin/env node
/**
 * 第 3 层防线：按"改了什么文件"校验 commit 类型。
 *
 * 规则：feat / fix 只能用在改动了 **app 源码** 的提交上。
 * 如果本次暂存的全是工具链 / 配置 / 文档文件，强制改用 build / ci / chore / docs，
 * 防止工具链提交触发版本号 bump（feat→minor, fix→patch）。
 *
 * 判定方式：把暂存文件分成"工具链"和"app 源码"两组。
 *   - 只要有一个 app 源码文件 → 放行 feat/fix
 *   - 全是工具链文件 → 拒绝 feat/fix
 *
 * 工具链（顶不动版本号）的目录：
 *   scripts  fastlane  .github  .husky  .vscode  .codex
 *   docs  test  tests  __tests__  e2e  build  vendor  ios  android
 *
 * 工具链根文件：package.json app.json tsconfig.json eas.json .versionrc
 *   commitlint.config  babel/metro/vitest.config  mise.toml  Gemfile
 *   以及扩展名 md mjs cjs yml yaml toml rb lock snap plist
 *
 * app 源码（可以 feat/fix）：src  App.tsx  index.ts  assets
 *   ios-share-extension  plugins，以及任何不匹配上面工具链规则的源文件
 *
 * 参数：$1 = git 传入的 commit message 文件路径（husky commit-msg 透传）
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const msgFile = process.argv[2];
if (!msgFile) process.exit(0);

const raw = readFileSync(msgFile, "utf8");
const firstLine = raw.split("\n").find((l) => l && !l.startsWith("#")) || "";
const matched = /^(\w+)(?:\(.+?\))?:/.exec(firstLine);
const type = matched ? matched[1] : null;

// 只拦截会触发版本 bump 的类型；其它类型直接放行
if (type !== "feat" && type !== "fix") process.exit(0);

let files;
try {
  files = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  process.exit(0); // 拿不到暂存区（如 amend / 无暂存）就不拦
}
if (files.length === 0) process.exit(0);

const TOOLING = [
  // 工具链 / 生成物目录
  /^(scripts|fastlane|\.github|\.husky|\.vscode|\.codex|docs?|tests?|__tests__|e2e|build|vendor|ios|android)\//,
  // 根级配置 / 元文件
  /^(\.versionrc|\.commitlintrc.*|commitlint\.config\..*|\.editorconfig|\.gitignore|\.gitattributes|\.npmrc|\.nvmrc|\.node-version|package\.json|pnpm-lock\.yaml|tsconfig\.json|jsconfig\.json|app\.json|app\.config\..*|babel\.config\..*|metro\.config\..*|eas\.json|vitest\.config\..*|mise\.toml|\.mise\..*|Gemfile.*|\.rubocop.*|CHANGELOG\.md|README\.md)$/,
  // 通用工具链扩展名
  /\.(md|mjs|cjs|yml|yaml|toml|rb|lock|snap|plist)$/,
];

const isTooling = (p) => TOOLING.some((re) => re.test(p));
const toolingFiles = files.filter(isTooling);
const appFiles = files.filter((f) => !isTooling(f));

if (appFiles.length > 0) process.exit(0); // 有 app 源码 → 放行

process.stderr.write(
  "\n" +
    "  ✋ commit-type-guard: 拒绝此提交。\n" +
    `  类型 "${type}" 只能用于改动了 app 源码（src/ App.tsx assets/ ios-share-extension/ …）的提交。\n` +
    "  本次暂存的全是工具链 / 配置文件：\n" +
    toolingFiles
      .slice(0, 8)
      .map((f) => `    - ${f}`)
      .join("\n") +
    (toolingFiles.length > 8 ? `\n    - …还有 ${toolingFiles.length - 8} 个` : "") +
    "\n  → 请改用 build: / ci: / chore: / docs: 重写提交信息。\n" +
    "    （这能防止工具链改动把版本号顶高：feat→minor, fix→patch）\n\n",
);
process.exit(1);
