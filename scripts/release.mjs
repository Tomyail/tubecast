#!/usr/bin/env node
// mobile/scripts/release.mjs
//
// TubeCast 发版编排（Plan 007）。三段流程的 A/C 段在这里；B 段（Xcode 打包上传）人工。
//
//   pnpm --filter mobile release:version   A: buildNumber+1 → CATV bump 版本/CHANGELOG/tag → push → 建【草稿】release
//   pnpm --filter mobile release:archive   B 前: expo prebuild（把 buildNumber 写进 native 工程）
//   pnpm --filter mobile release:publish   C: 草稿 release 转正 + 根仓库子模块指针 bump
//   pnpm --filter mobile release:rebuild   热修: 只 buildNumber+1（不动 marketing 版本）后重打包重传
//   pnpm --filter mobile release:testflight TestFlight: prebuild + 同步 Xcode 版本 + 打 testflight/<version>-<build> tag + GitHub changelog
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

function testflightReleaseNotes(tag) {
  const previous = previousTestflightTag(tag);
  const range = previous ? `${previous}..${tag}` : tag;
  const commits = execSync(`git log --no-merges --pretty=format:%s ${shellQuote(range)}`, {
    cwd: mobileRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^chore\(mobile\): bump buildNumber to \d+$/.test(line));

  const lines = [`## TestFlight ${tag.replace(/^testflight\//, "")}`];
  if (previous) lines.push("", `Changes since ${previous}:`);
  lines.push("");
  if (commits.length === 0) {
    lines.push("- Build number only; no app-facing changes.");
  } else {
    lines.push(...commits.map((commit) => `- ${commit}`));
  }
  lines.push("", `**Full Changelog**: https://github.com/${GH_REPO}/compare/${previous ?? ""}...${tag}`);
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

// ---- archive：prebuild，把 buildNumber 写进 native 工程 ----
function cmdArchive() {
  run("pnpm exec expo prebuild --platform ios --clean", { cwd: mobileRoot, stdio: "inherit" });
  syncNativeIosVersion();
  console.log("\n✅ prebuild 完成。现在在 Xcode 打开 mobile/ios/TubeCast.xcworkspace → Product → Archive → 导出 IPA → Transporter 上传。");
}

function cmdSyncIos() {
  syncNativeIosVersion();
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
  cmdArchive();
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

// ---- 热修重传：只 buildNumber+1，不 bump marketing 版本 ----
function cmdRebuild() {
  const bn = bumpBuildNumber();
  run(`git add app.json`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git commit -m "chore(mobile): bump buildNumber to ${bn}"`, { cwd: mobileRoot, stdio: "inherit" });
  run(`git push origin HEAD`, { cwd: mobileRoot, stdio: "inherit" });
  console.log(`\n✅ buildNumber → ${bn}（marketing 版本不变）。重跑 release:archive 重新打包上传。`);
}

const COMMANDS = {
  version: cmdVersion,
  publish: cmdPublish,
  archive: cmdArchive,
  rebuild: cmdRebuild,
  "sync-ios": cmdSyncIos,
  testflight: cmdTestflight,
  "testflight-tag": cmdTestflightTag,
};
const cmd = process.argv[2];
if (!cmd || !COMMANDS[cmd]) {
  console.error("用法: release.mjs <version|publish|archive|rebuild|sync-ios|testflight|testflight-tag>");
  console.error("  version  A 段：bump 版本/buildNumber + CHANGELOG + tag + 草稿 release");
  console.error("  archive  B 前：expo prebuild（写 buildNumber 进工程）");
  console.error("  publish  C 段：草稿转正 + 根仓库指针 bump");
  console.error("  rebuild  热修：只 buildNumber+1，重打包重传");
  console.error("  sync-ios 同步 app.json 版本到 Xcode 原生工程");
  console.error("  testflight 生成 iOS 工程并打 testflight/<version>-<build> tag + GitHub changelog");
  console.error("  testflight-tag 只打并推送 testflight/<version>-<build> tag + GitHub changelog");
  process.exit(1);
}
COMMANDS[cmd]();
