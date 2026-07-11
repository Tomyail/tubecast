#!/usr/bin/env node
// mobile/scripts/release.mjs
//
// TubeCast 发版编排（Plan 007）。三段流程的 A/C 段在这里；B 段（Xcode 打包上传）人工。
//
//   pnpm --filter mobile release:version   A: buildNumber+1 → CATV bump 版本/CHANGELOG/tag → push → 建【草稿】release
//   pnpm --filter mobile release:archive   B 前: expo prebuild（把 buildNumber 写进 native 工程）
//   pnpm --filter mobile release:publish   C: 草稿 release 转正 + 根仓库子模块指针 bump
//   pnpm --filter mobile release:rebuild   热修: 只 buildNumber+1（不动 marketing 版本）后重打包重传
//   pnpm --filter mobile release:testflight-bump       TestFlight: buildNumber+1 → commit → push
//   pnpm --filter mobile release:testflight-prepare    TestFlight: prebuild + 同步 Xcode 版本
//   pnpm --filter mobile release:testflight-build      TestFlight: fastlane build_app 生成 IPA
//   pnpm --filter mobile release:testflight-upload     TestFlight: 上传 IPA，不分发给测试组
//   pnpm --filter mobile release:testflight-changelog  TestFlight: 从 git commit 生成工程版变更记录
//   pnpm --filter mobile release:testflight-distribute TestFlight: 分发已上传 build 到测试组
//   pnpm --filter mobile release:testflight-tag        TestFlight: 打 testflight/<version>-<build> tag + GitHub changelog
//
// 跨两个仓库：mobile（公开 GitHub Tomyail/tubecast）+ 根（私有 Gitea yt-audio）。
// 全程用 git -C / cwd，绝不 cd（避免权限提示与不可重入）。

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, ".."); // mobile/
const repoRoot = path.resolve(mobileRoot, ".."); // 根仓库
const APP_JSON = path.join(mobileRoot, "app.json");
const CHANGELOG = path.join(mobileRoot, "CHANGELOG.md");
const IOS_INFO_PLIST = path.join(mobileRoot, "ios", "TubeCast", "Info.plist");
const IOS_PROJECT = path.join(mobileRoot, "ios", "TubeCast.xcodeproj", "project.pbxproj");
const GH_REPO = "Tomyail/tubecast";
const TESTFLIGHT_CHANGELOG = path.join(mobileRoot, ".testflight-changelog.md");
const DEFAULT_TESTFLIGHT_GROUPS = "Public Beta Testers";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}
function runFastlane(lane, opts = {}) {
  run(`mise exec -- bundle exec fastlane ${lane}`, { cwd: mobileRoot, ...opts });
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

function currentBuildNumber() {
  const app = readJson(APP_JSON);
  const buildNumber = app.expo?.ios?.buildNumber;
  if (!buildNumber) throw new Error("app.json 缺少 expo.ios.buildNumber。");
  return String(buildNumber);
}

function syncNativeIosVersion() {
  const app = readJson(APP_JSON);
  const version = app.expo?.version;
  const buildNumber = currentBuildNumber();
  if (!version) throw new Error("app.json 缺少 expo.version。");
  if (!existsSync(IOS_INFO_PLIST) || !existsSync(IOS_PROJECT)) {
    throw new Error("ios 原生工程不存在。先运行 release:archive 或 expo prebuild。");
  }

  let plist = readFileSync(IOS_INFO_PLIST, "utf8");
  plist = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${version}$2`,
  );
  plist = plist.replace(/(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/, `$1${buildNumber}$2`);
  writeFileSync(IOS_INFO_PLIST, plist);

  let project = readFileSync(IOS_PROJECT, "utf8");
  project = project.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
  project = project.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
  writeFileSync(IOS_PROJECT, project);

  console.log(`✅ Xcode 版本已同步：${version} (${buildNumber})`);
}

function testflightTagName() {
  return `testflight/${currentVersion()}-${currentBuildNumber()}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function tagExists(tag) {
  try {
    execSync(`git rev-parse -q --verify refs/tags/${shellQuote(tag)}`, { cwd: mobileRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function githubReleaseExists(tag) {
  try {
    execSync(`gh release view "${tag}" -R ${GH_REPO}`, { cwd: mobileRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ensureTestflightReleaseNotes(tag) {
  const notes = testflightReleaseNotes(tag);
  const tmp = path.join(mobileRoot, `.release-notes-${tag.replace(/[\\/]/g, "-")}.md`);
  writeFileSync(tmp, notes + "\n");
  if (githubReleaseExists(tag)) {
    run(`gh release edit "${tag}" -R ${GH_REPO} --title "${tag}" --prerelease --notes-file ${tmp}`, {
      cwd: mobileRoot,
      stdio: "inherit",
    });
    rmSync(tmp, { force: true });
    console.log(`✅ 已更新 GitHub changelog：${tag}`);
    return;
  }
  run(`gh release create "${tag}" -R ${GH_REPO} --title "${tag}" --prerelease --notes-file ${tmp}`, {
    cwd: mobileRoot,
    stdio: "inherit",
  });
  rmSync(tmp, { force: true });
  console.log(`✅ 已生成 GitHub changelog：${tag}`);
}

function parseTestflightTag(tag) {
  const match = /^testflight\/(.+)-(\d+)$/.exec(tag);
  if (!match) return null;
  return { version: match[1], build: Number(match[2]) };
}

function previousTestflightTag(tag) {
  const current = parseTestflightTag(tag);
  if (!current) return null;
  const tags = execSync(`git tag --list ${shellQuote(`testflight/${current.version}-*`)}`, {
    cwd: mobileRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((candidate) => ({ tag: candidate, parsed: parseTestflightTag(candidate) }))
    .filter(({ parsed }) => parsed && parsed.version === current.version && parsed.build < current.build)
    .sort((a, b) => b.parsed.build - a.parsed.build);
  return tags[0]?.tag ?? null;
}

function testflightRange(tag, endRef = tag) {
  const previous = previousTestflightTag(tag);
  if (previous) {
    return { previous, range: `${previous}..${endRef}`, compareBase: previous };
  }

  const root = execSync("git rev-list --max-parents=0 HEAD", {
    cwd: mobileRoot,
    encoding: "utf8",
  }).trim().split(/\r?\n/)[0];
  return { previous: null, range: `${root}..${endRef}`, compareBase: root };
}

function testflightCommitSubjects(range) {
  return execSync(`git log --no-merges --pretty=format:%s ${shellQuote(range)}`, {
    cwd: mobileRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^chore\(mobile\): bump buildNumber to \d+$/.test(line));
}

function testflightReleaseNotes(tag) {
  const { previous, range, compareBase } = testflightRange(tag);
  const commits = testflightCommitSubjects(range);

  const lines = [`## TestFlight ${tag.replace(/^testflight\//, "")}`];
  if (previous) lines.push("", `Changes since ${previous}:`);
  lines.push("");
  if (commits.length === 0) {
    lines.push("- Build number only; no app-facing changes.");
  } else {
    lines.push(...commits.map((commit) => `- ${commit}`));
  }
  lines.push("", `**Full Changelog**: https://github.com/${GH_REPO}/compare/${compareBase}...${tag}`);
  return lines.join("\n");
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

// CHANGELOG.md 里最新一个版本段。兼容两种 conventional-changelog 标题：
//   带比较链接 "## [1.1.0](url) (date)"  与  首版无链接 "## 1.1.0 (date)"。
function latestChangelogSection() {
  const text = readFileSync(CHANGELOG, "utf8");
  const sections = text.split(/\n(?=## \[?\d)/); // [标题块, 最新版, 更早...]
  if (sections.length < 2) {
    throw new Error("CHANGELOG.md 里找不到版本段（## x.y.z）。先跑过一次 release:version 或 bootstrap。");
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

function prebuildIos() {
  run("pnpm exec expo prebuild --platform ios --clean", { cwd: mobileRoot, stdio: "inherit" });
  syncNativeIosVersion();
}

// ---- archive：prebuild，把 buildNumber 写进 native 工程 ----
function cmdArchive() {
  prebuildIos();
  console.log("\n✅ prebuild 完成。现在在 Xcode 打开 mobile/ios/TubeCast.xcworkspace → Product → Archive → 导出 IPA → Transporter 上传。");
}

function cmdTestflightPrepare() {
  prebuildIos();
  console.log("\n✅ TestFlight prepare 完成。下一步：pnpm release:testflight-build");
}

function cmdSyncIos() {
  syncNativeIosVersion();
}

function commitBuildNumberBump() {
  const bn = bumpBuildNumber();
  run(`git add app.json`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git commit -m "chore(mobile): bump buildNumber to ${bn}"`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git push origin HEAD`, { cwd: mobileRoot, stdio: "inherit" });
  return bn;
}

function cmdTestflightBump() {
  const bn = commitBuildNumberBump();
  console.log(`\n✅ TestFlight buildNumber → ${bn}。下一步：pnpm release:testflight-prepare`);
}

function cmdTestflightBuild() {
  runFastlane("testflight_build");
  console.log("\n✅ IPA 已生成。下一步：pnpm release:testflight-upload");
}

function cmdTestflightUpload() {
  runFastlane("testflight_upload");
  console.log("\n✅ IPA 已上传到 TestFlight，未自动分发。下一步：pnpm release:testflight-changelog 或在 App Store Connect 手动处理。");
}

function cmdTestflightChangelog() {
  const tag = testflightTagName();
  const { previous, range, compareBase } = testflightRange(tag, "HEAD");
  const commits = testflightCommitSubjects(range);
  const lines = [`# TestFlight ${tag.replace(/^testflight\//, "")}`, ""];
  lines.push(`Source range: ${previous ? `${previous}..HEAD` : `${compareBase}..HEAD`}`, "");
  lines.push("Raw commit log:", "");
  if (commits.length === 0) {
    lines.push("- Build number only; no app-facing changes.");
  } else {
    lines.push(...commits.map((commit) => `- ${commit}`));
  }
  lines.push("");
  writeFileSync(TESTFLIGHT_CHANGELOG, lines.join("\n"));
  console.log(`✅ 已生成工程版 TestFlight changelog：${path.relative(mobileRoot, TESTFLIGHT_CHANGELOG)}`);
  console.log("   你可以把它交给 AI 改写成面向测试用户的 What to Test。");
}

function cmdTestflightDistribute() {
  if (!process.env.TESTFLIGHT_CHANGELOG?.trim()) {
    throw new Error("缺少 TESTFLIGHT_CHANGELOG。先写好面向测试用户的 What to Test，再运行 distribute。");
  }

  runFastlane("testflight_distribute", {
    env: {
      ...process.env,
      TESTFLIGHT_VERSION: process.env.TESTFLIGHT_VERSION || currentVersion(),
      TESTFLIGHT_BUILD_NUMBER: process.env.TESTFLIGHT_BUILD_NUMBER || currentBuildNumber(),
      TESTFLIGHT_GROUPS: process.env.TESTFLIGHT_GROUPS || DEFAULT_TESTFLIGHT_GROUPS,
      TESTFLIGHT_EXTERNAL: process.env.TESTFLIGHT_EXTERNAL || "1",
    },
  });
  console.log("\n✅ TestFlight build 已分发。默认不通知外部测试用户；需要通知时使用 TESTFLIGHT_NOTIFY=1。");
}

function cmdTestflightTag() {
  const tag = testflightTagName();
  if (tagExists(tag)) {
    console.log(`✅ tag 已存在：${tag}`);
  } else {
    run(`git tag ${tag}`, { cwd: mobileRoot, stdio: "inherit" });
    console.log(`✅ 已创建 tag：${tag}`);
  }
  run(`git push origin refs/tags/${tag}`, { cwd: mobileRoot, stdio: "inherit" });
  console.log(`✅ 已推送 tag：${tag}`);
  ensureTestflightReleaseNotes(tag);
}

function cmdTestflight() {
  cmdTestflightPrepare();
  cmdTestflightTag();
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

// ---- 只更新 CHANGELOG，不 bump 版本 ----
function cmdChangelog() {
  const ver = currentVersion();
  const lastTag = `v${ver}`;
  const today = new Date().toISOString().slice(0, 10);

  // 如果没有 v* tag，用仓库第一个提交作为起点
  let range = `${lastTag}..HEAD`;
  if (!tagExists(lastTag)) {
    const root = execSync("git rev-list --max-parents=0 HEAD", {
      cwd: mobileRoot,
      encoding: "utf8",
    }).trim().split(/\r?\n/)[0];
    range = `${root}..HEAD`;
    console.log(`ℹ  未找到 ${lastTag}，使用仓库第一个提交作为起点。`);
  }

  // 只取该版本以来的提交（排除 chore(release) 和 chore(mobile): bump buildNumber）
  const commits = execSync(
    `git log --no-merges --pretty=format:"%s" ${range}`,
    { cwd: mobileRoot, encoding: "utf8" },
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^chore\((mobile|release)\)/.test(line));

  if (commits.length === 0) {
    console.log(`ℹ  ${lastTag} 之后没有新提交，跳过。`);
    return;
  }

  const groups = { feat: [], fix: [], perf: [], refactor: [], docs: [] };
  for (const msg of commits) {
    const m = /^(\w+)(\([^)]+\))?:\s*(.*)/.exec(msg);
    const type = m ? m[1] : "other";
    const text = msg;
    (groups[type] ?? (groups.other = [])).push(text);
  }

  const lines = [`## ${ver} (${today})`, ""];
  const labels = { feat: "Features", fix: "Bug Fixes", perf: "Performance", refactor: "Refactoring", docs: "Documentation", other: "Other" };

  for (const [type, msgs] of Object.entries(groups)) {
    if (!msgs || msgs.length === 0) continue;
    lines.push(`### ${labels[type] || type}`, "");
    for (const msg of msgs) lines.push(`* ${msg}`);
    lines.push("");
  }

  const section = lines.join("\n");
  const old = readFileSync(CHANGELOG, "utf8");
  const headerEnd = old.indexOf("\n## ") === -1 ? old.length : old.indexOf("\n## ");
  const header = old.slice(0, headerEnd);
  const rest = old.slice(headerEnd);
  writeFileSync(CHANGELOG, header + "\n\n" + section + "\n" + rest);

  run(`git add CHANGELOG.md`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git commit -m "chore(mobile): update CHANGELOG for ${ver}"`, { cwd: mobileRoot, stdio: "inherit" });
  console.log(`✅ CHANGELOG 已更新（${ver}）并提交。`);
}

// ---- 热修重传：只 buildNumber+1，不 bump marketing 版本 ----
function cmdRebuild() {
  const bn = commitBuildNumberBump();
  console.log(`\n✅ buildNumber → ${bn}（marketing 版本不变）。重跑 release:archive 重新打包上传。`);
}

const COMMANDS = {
  version: cmdVersion,
  publish: cmdPublish,
  archive: cmdArchive,
  rebuild: cmdRebuild,
  changelog: cmdChangelog,
  "sync-ios": cmdSyncIos,
  testflight: cmdTestflight,
  "testflight-bump": cmdTestflightBump,
  "testflight-prepare": cmdTestflightPrepare,
  "testflight-build": cmdTestflightBuild,
  "testflight-upload": cmdTestflightUpload,
  "testflight-changelog": cmdTestflightChangelog,
  "testflight-distribute": cmdTestflightDistribute,
  "testflight-tag": cmdTestflightTag,
};
const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.error("用法: release.mjs <version|publish|archive|rebuild|changelog|sync-ios|testflight|testflight-bump|testflight-prepare|testflight-build|testflight-upload|testflight-changelog|testflight-distribute|testflight-tag>");
  console.error("  version   A 段：bump 版本/buildNumber + CHANGELOG + tag + 草稿 release");
  console.error("  archive   B 前：expo prebuild（写 buildNumber 进工程）");
  console.error("  publish   C 段：草稿转正 + 根仓库指针 bump");
  console.error("  rebuild   热修：只 buildNumber+1，重打包重传");
  console.error("  changelog 只更新 CHANGELOG（从 git log），不 bump 版本");
  console.error("  sync-ios  同步 app.json 版本到 Xcode 原生工程");
  console.error("  testflight 旧入口：prepare + testflight-tag");
  console.error("  testflight-bump buildNumber+1，提交并 push");
  console.error("  testflight-prepare 生成 iOS 工程并同步 Xcode 版本");
  console.error("  testflight-build 使用 fastlane build_app 生成 IPA");
  console.error("  testflight-upload 上传 IPA，不分发给测试组");
  console.error("  testflight-changelog 从 git commit 生成工程版 changelog");
  console.error("  testflight-distribute 分发已上传 build 到 TestFlight 测试组");
  console.error("  testflight-tag 只打并推送 testflight/<version>-<build> tag + GitHub changelog");
  process.exit(1);
}
COMMANDS[cmd]();
