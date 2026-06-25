#!/usr/bin/env node
// mobile/scripts/release.mjs
//
// TubeCast 发版编排（Plan 007）。三段流程的 A/C 段在这里；B 段（Xcode 打包上传）人工。
//
//   pnpm --filter mobile release:version   A: buildNumber+1 → CATV bump 版本/CHANGELOG/tag → push → 建【草稿】release
//   pnpm --filter mobile release:archive   B 前: expo prebuild（把 buildNumber 写进 native 工程）
//   pnpm --filter mobile release:publish   C: 草稿 release 转正 + 根仓库子模块指针 bump
//   pnpm --filter mobile release:rebuild   热修: 只 buildNumber+1（不动 marketing 版本）后重打包重传
//
// 跨两个仓库：mobile（公开 GitHub Tomyail/tubecast）+ 根（私有 Gitea yt-audio）。
// 全程用 git -C / cwd，绝不 cd（避免权限提示与不可重入）。

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, ".."); // mobile/
const repoRoot = path.resolve(mobileRoot, ".."); // 根仓库
const APP_JSON = path.join(mobileRoot, "app.json");
const CHANGELOG = path.join(mobileRoot, "CHANGELOG.md");
const GH_REPO = "Tomyail/tubecast";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}
function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function currentVersion() {
  // 读 package.json.version——这是 CATV 用来命名 tag 的权威源。
  // (app.json 的 expo.version 由 appjson-updater.cjs 同步过去，但 tag 名始终跟 package.json。)
  return readJson(path.join(mobileRoot, "package.json")).version;
}

// buildNumber +1（字符串整数）。必须在 CATV 之前调用——app.json 是 CATV 的 bumpFile，
// CATV 提交时会 git add app.json，从而把这次 buildNumber 变更一并纳入版本提交。
function bumpBuildNumber() {
  const app = readJson(APP_JSON);
  const cur = app.expo.ios.buildNumber;
  if (cur == null) throw new Error("app.json 缺少 expo.ios.buildNumber——先按 Plan 007 Step 1a 加上。");
  const next = String(Number(cur) + 1);
  app.expo.ios.buildNumber = next;
  writeJson(APP_JSON, app);
  return next;
}

// CHANGELOG.md 里最新一个版本段（第一个 "## [" 到下一个 "## [" 之间）。
function latestChangelogSection() {
  const text = readFileSync(CHANGELOG, "utf8");
  const sections = text.split(/\n(?=## \[)/); // [标题块, 最新版, 更早...]
  if (sections.length < 2) {
    throw new Error("CHANGELOG.md 里找不到版本段（## [x.y.z]）。先跑过一次 release:version 或 bootstrap。");
  }
  return sections[1].trim();
}

// ---- A: 打 tag + 草稿 release ----
function cmdVersion() {
  const bn = bumpBuildNumber(); // 1) 先改 app.json，CATV 会把它打进同一提交
  run("pnpm exec commit-and-tag-version", { cwd: mobileRoot, stdio: "inherit" }); // 2) bump 版本+CHANGELOG+提交+建 tag
  const ver = currentVersion();
  const tag = `v${ver}`;
  run(`git push origin HEAD --follow-tags`, { cwd: mobileRoot, stdio: "inherit" }); // 3) push 提交 + annotated tag（v1.x）到公开 mobile 仓库
  const notes = latestChangelogSection(); // 4) 用 CHANGELOG 最新一段建【草稿】release
  const tmp = path.join(mobileRoot, `.release-notes-${tag}.md`);
  writeFileSync(tmp, notes + "\n");
  run(
    `gh release create ${tag} -R ${GH_REPO} --draft --title "${tag}" --notes-file ${tmp}`,
    { cwd: mobileRoot, stdio: "inherit" },
  );
  rmSync(tmp, { force: true });
  console.log(`\n✅ A 段完成：tag ${tag}（buildNumber ${bn}）已 push；GitHub Release 为【草稿】。`);
  console.log(`   接下来人工：pnpm --filter mobile release:archive → Xcode Archive → 上传 → ASC 加组 + 双语 What's New。`);
  console.log(`   TestFlight 上线后跑：pnpm --filter mobile release:publish`);
}

// ---- archive：prebuild，把 buildNumber 写进 native 工程 ----
function cmdArchive() {
  run("pnpm exec expo prebuild --platform ios --clean", { cwd: mobileRoot, stdio: "inherit" });
  console.log("\n✅ prebuild 完成。现在在 Xcode 打开 mobile/ios/TubeCast.xcworkspace → Product → Archive → 导出 IPA → Transporter 上传。");
}

// ---- C: 转正 release + 根仓库指针 bump ----
function cmdPublish() {
  const ver = currentVersion();
  const tag = `v${ver}`;
  run(`gh release edit ${tag} -R ${GH_REPO} --draft=false`, { cwd: mobileRoot, stdio: "inherit" });
  // 根仓库提交子模块指针 bump（mobile 已是新 SHA）
  run(`git add mobile`, { cwd: repoRoot, stdio: "inherit" });
  run(`git commit -m "chore: bump mobile to ${tag}"`, { cwd: repoRoot, stdio: "inherit" });
  run(`git push`, { cwd: repoRoot, stdio: "inherit" });
  console.log(`\n✅ C 段完成：${tag} 的 GitHub Release 已公开；根仓库指针已 bump 并 push 到 Gitea。`);
}

// ---- 热修重传：只 buildNumber+1，不 bump marketing 版本 ----
function cmdRebuild() {
  const bn = bumpBuildNumber();
  run(`git add app.json`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git commit -m "chore(mobile): bump buildNumber to ${bn}"`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git push origin HEAD`, { cwd: mobileRoot, stdio: "inherit" });
  console.log(`\n✅ buildNumber → ${bn}（marketing 版本不变）。重跑 release:archive 重新打包上传。`);
}

const COMMANDS = { version: cmdVersion, publish: cmdPublish, archive: cmdArchive, rebuild: cmdRebuild };
const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.error("用法: release.mjs <version|publish|archive|rebuild>");
  console.error("  version  A 段：bump 版本/buildNumber + CHANGELOG + tag + 草稿 release");
  console.error("  archive  B 前：expo prebuild（写 buildNumber 进工程）");
  console.error("  publish  C 段：草稿转正 + 根仓库指针 bump");
  console.error("  rebuild  热修：只 buildNumber+1，重打包重传");
  process.exit(1);
}
COMMANDS[cmd]();
