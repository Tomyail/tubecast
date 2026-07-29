#!/usr/bin/env node
// mobile/scripts/generate-testflight-notes.mjs
//
// 读 .testflight-changelog.md（由 `release.mjs testflight-changelog` 生成的原始 commit 列表），
// 调 LLM 改写成面向测试用户的中英双语 "What to Test"，写入 .testflight-whats-new。
// .testflight-whats-new 是 fastlane Fastfile 的 testflight_distribute lane 已有的读取契约
// （TESTFLIGHT_CHANGELOG env 缺失时的兜底文件），这里只是把"人工改写"这一步换成 LLM。
//
//   node scripts/generate-testflight-notes.mjs           写入 .testflight-whats-new
//   node scripts/generate-testflight-notes.mjs --dry-run  只打印，不写文件（本地测试用）

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const CHANGELOG_INPUT = path.join(mobileRoot, ".testflight-changelog.md");
const WHATS_NEW_OUTPUT = path.join(mobileRoot, ".testflight-whats-new");

const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_ID = process.env.RELEASE_NOTES_MODEL_ID || process.env.OPENWIKI_MODEL_ID || "glm-5.2";

const PROMPT_INSTRUCTIONS = `你会收到一份 TestFlight 内部工程版 changelog（原始 conventional commit 列表）。
请把它改写成面向 TestFlight 测试用户的"本次要测什么"（What to Test）说明，要求：
- 只保留用户能感知到的变化，忽略纯内部重构/工具链调整（如果整份列表都是内部调整，就写"本次为稳定性/内部改进，无需特别测试项"这类说明）
- 语气简洁、口语化，不要逐条罗列 commit 原文
- 同时输出英文和中文两段，各 2-4 句即可
- 只输出如下 JSON，不要任何其他文字：{"en": "...", "zh": "..."}`;

function readRawChangelog() {
  if (!existsSync(CHANGELOG_INPUT)) {
    throw new Error(
      `找不到 ${path.relative(mobileRoot, CHANGELOG_INPUT)}。先运行 node scripts/release.mjs testflight-changelog。`,
    );
  }
  return readFileSync(CHANGELOG_INPUT, "utf8");
}

async function callLlm(rawChangelog) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("缺少 ANTHROPIC_API_KEY。");
  }

  const res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${PROMPT_INSTRUCTIONS}\n\n---\n${rawChangelog}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${res.statusText}\n${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.map((block) => block.text ?? "").join("") ?? "";
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) {
    throw new Error(`LLM 返回内容不是预期的 JSON：\n${text}`);
  }
  const parsed = JSON.parse(match[0]);
  if (!parsed.en || !parsed.zh) {
    throw new Error(`LLM 返回缺少 en/zh 字段：\n${text}`);
  }
  return parsed;
}

function composeWhatsNew({ en, zh }) {
  return `${en.trim()}\n\n中文:\n${zh.trim()}\n`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rawChangelog = readRawChangelog();
  const { en, zh } = await callLlm(rawChangelog);
  const whatsNew = composeWhatsNew({ en, zh });

  if (dryRun) {
    console.log(whatsNew);
    return;
  }

  writeFileSync(WHATS_NEW_OUTPUT, whatsNew);
  console.log(`✅ 已生成双语 TestFlight 说明：${path.relative(mobileRoot, WHATS_NEW_OUTPUT)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
