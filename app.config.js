const { execSync } = require("node:child_process");

const app = require("./app.json");

function normalizeCommit(value) {
  return value ? String(value).trim() : undefined;
}

function readGitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

const buildCommit =
  normalizeCommit(process.env.EXPO_PUBLIC_GIT_COMMIT) ||
  normalizeCommit(process.env.EAS_BUILD_GIT_COMMIT_HASH) ||
  normalizeCommit(process.env.GITHUB_SHA) ||
  readGitCommit() ||
  "unknown";

module.exports = {
  ...app.expo,
  extra: {
    ...app.expo.extra,
    buildCommit,
  },
};
