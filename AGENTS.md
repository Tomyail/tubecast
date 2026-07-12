# AGENTS.md — 给 AI 编码代理 / 协作者的约定

本文件告诉任何在本仓库（`mobile/`，TubeCast iOS/Android 客户端）写代码或提交的人或
AI 代理：**如何写提交信息**。提交信息直接驱动版本号 bump（见下方），写错会让用户可见
的 App Store 版本号被错误顶高，所以请严格遵守。

## 提交信息格式

```
type(scope): subject
```

- `type` 必填，且必须在下面的白名单内（commitlint 会拦截非法 type）。
- `scope` 可选（如 `mobile`、`player`、`release`），不强制。
- `subject` 简短描述，中英文均可（允许大写 / 中文开头）。
- header 总长 ≤ 100 字符。

## type 的判定标准（关键！）

判定 `type` 看的是**这次提交改了什么文件**，而不是"我感觉这是不是个新功能"。

| 场景 | 用什么 | 例子 |
|---|---|---|
| 改了 **app 源码**（`src/`、`App.tsx`、`index.ts`、`assets/`、`ios-share-extension/`），用户能感知的新功能 | `feat` | `feat(player): 支持锁屏拖动进度条` |
| 改了 **app 源码**，修复 bug | `fix` | `fix(share): 创建 moment 后分享面板不消失` |
| app 源码性能优化 / 重构（不改外部行为） | `perf` / `refactor` | `perf(list): 虚拟化播放列表` |
| 文档 | `docs` | `docs: 补充 fastlane 发版说明` |
| 测试 | `test` | `test: 覆盖 job 轮询逻辑` |
| **构建系统 / 依赖 / 发版脚本 / fastlane / expo prebuild 配置** | `build` | `build: fastlane 改用 API Key 认证` |
| **CI 配置**（`.github/workflows` 等） | `ci` | `ci: 增加 worker 镜像构建工作流` |
| 不属于以上任何类的杂项 | `chore` | `chore: 升级依赖` |

### 绝对不要犯的错

> ❌ **工具链 / CI / 发版脚本 / 配置改动，绝不用 `feat:` 或 `fix:`。**

错误示例（会顶高版本号）：
- `feat: 集成 fastlane` ← 这是工具链，应 `build: 集成 fastlane`
- `feat: 拆分 TestFlight 发布流程` ← 改的是 `scripts/release.mjs`，应 `build: 拆分 TestFlight 发布流程`
- `fix: 修 release 脚本 bug` ← 改的是脚本，应 `build:` / `chore:`

提交钩子（`scripts/commit-type-guard.mjs`）会**自动拦截**这类提交：当你用 `feat`/`fix`
但暂存的全是工具链文件（`scripts/` `fastlane/` `.github/` 配置/文档……），提交会被拒绝，
并提示你改用 `build`/`ci`/`chore`/`docs`。

## 版本号是怎么被决定的

版本号由 `commit-and-tag-version`（`pnpm release:version`）按提交类型自动 bump：

| type | bump | 示例 |
|---|---|---|
| `feat` | **minor** | 1.0.0 → 1.1.0 |
| `fix` / `perf` | **patch** | 1.0.0 → 1.0.1 |
| `BREAKING CHANGE` 或 `!` | **major** | 1.0.0 → 2.0.0 |
| 其它（`build` `ci` `chore` `docs` `refactor` `style` `test`） | **不 bump** | — |

这就是为什么"工具链误用 feat"很危险：它会发一个 minor 版本，而用户实际并没拿到新功能。

需要强制指定版本时用 `RELEASE_AS`：`RELEASE_AS=1.0.1 pnpm release:version`。

## 提交前的自检

1. 我改的是 app 源码吗？
   - 是 → 可以用 `feat` / `fix` / `perf` / `refactor`
   - 否（只改了脚本 / 配置 / CI / 文档）→ 必须用 `build` / `ci` / `chore` / `docs` / `test`
2. type 在白名单内吗？（不在会被 commitlint 拦截）
3. header ≤ 100 字符吗？

提交信息写好后，`.husky/commit-msg` 钩子会跑 commitlint + commit-type-guard 替你把关。

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
