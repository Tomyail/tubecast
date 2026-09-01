---
type: Development Guide
title: Development Conventions
description: Commit message rules enforced by commitlint and the husky commit-type-guard hook, how commit types drive version bumps, demo-asset guards, i18n requirements, and code organization conventions for TubeCast.
tags: [development, conventions, commits, versioning, i18n, git]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-01T21:28:30.610Z
sources:
  - id: openwiki-source-cf2bedd52c170bfab2bbf723
    resource: repo://.husky/commit-msg
  - id: openwiki-source-43c41f18d49c25a86be5e9ae
    resource: repo://.husky/pre-commit
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-054affe97c8df366a81ff578
    resource: repo://commitlint.config.cjs
  - id: openwiki-source-6d79505cfec47369459b3e5e
    resource: repo://scripts/commit-type-guard.mjs
  - id: openwiki-source-99267eb31f174540a6c513b1
    resource: repo://scripts/release.mjs
  - id: openwiki-source-e71f3ac1cc8f93872433e109
    resource: repo://src/features/demoMode/config.ts
  - id: openwiki-source-b16234b5752aa15156e9c2c9
    resource: repo://src/features/demoMode/data.ts
  - id: openwiki-source-07e1d31091696bf83c1af37c
    resource: repo://src/i18n/formatters.ts
  - id: openwiki-source-73242ed06ac96308eb582d63
    resource: repo://src/i18n/index.tsx
  - id: openwiki-source-0400e6ad3746e82a131d5687
    resource: repo://src/i18n/translations.ts
  - id: openwiki-source-c457d3d1a63d5dc86f0da7ef
    resource: repo://src/types.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-01T21:28:30.610Z" }
---

# Development Conventions

This page documents the conventions that govern contributing to TubeCast's `mobile/` client: the three-layer commit message enforcement (format whitelist, file-based type rules, automated versioning), the demo-asset release guard, internationalization requirements, and code organization. The authoritative source for commit rules is `AGENTS.md`, which is written for both humans and AI coding agents.

## Commit Message Format

TubeCast uses **Conventional Commits** with automated version bumping.

```
type(scope): subject
```

- **`type`** (required) — must be in the whitelist below; commitlint rejects anything else.
- **`scope`** (optional) — area affected (e.g., `mobile`, `player`, `release`); not enforced.
- **`subject`** — short description; Chinese or English is allowed, uppercase or Chinese-leading subjects are permitted (`subject-case` is disabled because the default lowercase rule is unfriendly to Chinese).
- Header total length ≤ 100 characters.

## Commit Types

The type is determined by **which files are changed**, not by how the author feels about the change.

| Scenario | Type | Example |
|----------|------|---------|
| **App source code changes** (`src/`, `App.tsx`, `index.ts`, `assets/`, `ios-share-extension/`, `plugins/`) — user-facing features | `feat` | `feat(player): add lock-screen progress scrubbing` |
| **App source code changes** — bug fixes | `fix` | `fix(share): dismiss share sheet after creating moment` |
| **App source code** — performance or refactor (no behavior change) | `perf` / `refactor` | `perf(list): virtualize playlist rendering` |
| Documentation | `docs` | `docs: add fastlane release guide` |
| Tests | `test` | `test: cover job polling logic` |
| Build system / dependencies / release scripts / fastlane / expo prebuild config | `build` | `build: fastlane switch to API Key auth` |
| CI configuration (`.github/workflows` etc.) | `ci` | `ci: add worker image build workflow` |
| Miscellaneous changes not covered above | `chore` | `chore: upgrade dependencies` |

### Critical Rule

> ❌ **Never use `feat:` or `fix:` for toolchain, CI, release scripts, or configuration changes.**

Wrong examples (these incorrectly bump the version number):

- `feat: integrate fastlane` → should be `build: integrate fastlane`
- `feat: split TestFlight flow` → changed `scripts/release.mjs`, so should be `build: split TestFlight flow`
- `fix: fix release script bug` → changed a script; should be `build:` or `chore:`

## Three-Layer Commit Enforcement

Commit quality is enforced at commit time by the `.husky/commit-msg` hook, which runs two checks in sequence:

1. **Layer 2 — format enforcement (commitlint).** `pnpm exec commitlint --edit "$1"` validates the header against `commitlint.config.cjs`, which extends `@commitlint/config-conventional` and pins `type-enum` to exactly: `feat`, `fix`, `perf`, `refactor`, `revert`, `docs`, `style`, `test`, `build`, `ci`, `chore`. It also sets `subject-case` to disabled (allowing Chinese/capitalized subjects) and `header-max-length` to 100. Merge commits, `Revert "` commits, and `Initial commit` are ignored so automated commits are never blocked.

2. **Layer 3 — file-based type validation (`scripts/commit-type-guard.mjs`).** Parses the commit header for its type; if the type is anything other than `feat` or `fix` (the only bump-triggering types), it exits immediately. Otherwise it lists staged files via `git diff --cached --name-only --diff-filter=ACM` and classifies each path as tooling or app source:
   - **Tooling paths** (cannot use `feat`/`fix`): directories `scripts/`, `fastlane/`, `.github/`, `.husky/`, `.vscode/`, `.codex/`, `docs/`, `test/`/`tests/`/`__tests__/`, `e2e/`, `build/`, `vendor/`, `ios/`, `android/`; root config files (`package.json`, `app.json`, `tsconfig.json`, `eas.json`, `.versionrc`, `commitlint.config.*`, babel/metro/vitest configs, `mise.toml`, `Gemfile*`, `CHANGELOG.md`, `README.md`, etc.); and any file with a tooling extension (`md`, `mjs`, `cjs`, `yml`, `yaml`, `toml`, `rb`, `lock`, `snap`, `plist`).
   - **App source** (may use `feat`/`fix`): `src/`, `App.tsx`, `index.ts`, `assets/`, `ios-share-extension/`, `plugins/`, and anything else not matching the tooling rules.
   - If **at least one** staged file is app source, the commit is allowed. If **all** staged files are tooling, the commit is rejected with exit code 1, listing the offending files (up to 8, then an ellipsis count) and directing the author to rewrite as `build:`/`ci:`/`chore:`/`docs:`. If the staged file list cannot be read (e.g., amend with no changes) or is empty, the guard lets the commit through.

The `.husky/pre-commit` hook is intentionally left empty (a commented-out `pnpm test`), so no lint/tests block commits by default; enable it there when needed.

## Version Bumping

Versions are bumped automatically by `commit-and-tag-version` (`pnpm release:version`; behavior configured via `.versionrc`) based on commit types:

| Type | Bump | Example |
|------|------|---------|
| `feat` | **minor** | 1.0.0 → 1.1.0 |
| `fix` / `perf` | **patch** | 1.0.0 → 1.0.1 |
| `BREAKING CHANGE` or `!` | **major** | 1.0.0 → 2.0.0 |
| Other (`build`, `ci`, `chore`, `docs`, `refactor`, `style`, `test`) | **no bump** | — |

This is why incorrect `feat` usage is dangerous: it releases a minor App Store version bump even though users get no new features — and the commit-type-guard exists specifically to block it.

To force a specific version: `RELEASE_AS=1.0.1 pnpm release:version`.

See [/openwiki/operations/release.md](/openwiki/operations/release.md) for the full release workflow.

## Demo-Asset Guard

Screenshot demo material must never be bundled into the shipping IPA. `scripts/release.mjs` exposes `assert-no-demo-assets`, which fails if the directory `assets/demo-covers/` exists, because anything under `assets/` gets packaged into the app. Demo covers must live in `screenshot-assets/demo-covers/` instead, and the demo-mode data layer (`src/features/demoMode/data.ts`) references them by remote URL (base configurable via `EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL`, defaulting to the GitHub raw URL of `screenshot-assets/demo-covers`), so store screenshots render realistic artwork without shipping those files.

Demo mode itself is gated by `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE` (truthy: `1`/`true`/`yes`, checked in `src/features/demoMode/config.ts`), and the screenshot language is controlled by `EXPO_PUBLIC_SCREENSHOT_DEMO_LANGUAGE`.

## i18n Conventions

All user-facing strings must go through the i18n layer in `src/i18n/` rather than being hardcoded:

- **`translations.ts`** — the single `resources` object with one `translation` namespace per locale. The currently supported locales are **English (`en`)** and **Simplified Chinese (`zh-CN`)**; `resolveLanguage` collapses any `zh-*` system tag to `zh-CN`. (Traditional Chinese is not currently a locale; adding `zh-TW` would mean adding a parallel resource block and extending `AppLanguage`/`resolveLanguage`.) When adding a UI string, add the key to **every** locale's resource block so no locale falls back to English.
- **`index.tsx`** — initializes `i18next` with `react-i18next` (`fallbackLng: "en"`, JSON v4 compatibility) and exposes `I18nProvider` + `useAppLanguage()`. Language preference is persisted in AsyncStorage under `settings_language` (allowed values `system`, `en`, `zh-CN`; anything else is treated as `system`). With preference `system`, the device locale from `expo-localization` is resolved to `en` or `zh-CN`. In screenshot demo mode the provider ignores the stored preference and uses `EXPO_PUBLIC_SCREENSHOT_DEMO_LANGUAGE` instead. The provider renders nothing until i18n is ready, preventing flash-of-wrong-language.
- **`formatters.ts`** — locale-aware helpers (`formatFileSize` uses `Intl.NumberFormat` with the resolved locale; `formatDuration` produces `m:ss` / `h:mm:ss`) so number formatting matches the selected language.
- Interpolation uses i18next `{{placeholders}}` (e.g., `failedAt: "Failed while {{phase}}"`, pluralized `ago.minute_one/minute_other`), and commit subjects themselves may be written in Chinese.

## AGENTS.md / CLAUDE.md Agent Guidance

`AGENTS.md` is the canonical brief for humans and AI coding agents working in the repo: it restates the commit format, the file-based type decision table, the version bump table, and the pre-commit self-check. `CLAUDE.md` simply points to `AGENTS.md`. The OpenWiki section within `AGENTS.md` additionally instructs agents to treat source and tests as authoritative, prefer the narrowest quiet validation, and never hand-edit generated `openwiki/` pages.

## Code Organization

### Feature Modules

Each feature in `src/features/` follows a consistent structure:

```
features/
├── player/          # Audio playback
│   ├── context.tsx  # React Context + state
│   ├── state.ts     # Reducer, types
│   └── hooks.ts     # Custom hooks
├── playlist/        # Local library
│   ├── storage.ts   # AsyncStorage backend
│   └── context.tsx  # React Context
├── youtubeFeed/     # YouTube subscriptions
│   ├── api.ts       # Backend API
│   ├── storage.ts   # Channel persistence
│   └── hooks.ts     # React Query hooks
└── jobs/            # Conversion jobs
    ├── api.ts       # Job status API
    ├── cache.ts     # Local cache management
    └── progress.ts  # Progress calculations
```

### Shared Modules, Screens, Components

- `src/shared/` — cross-cutting utilities (`apiClient.ts` Axios client, `errors.ts` error types, `imageSource.ts` image source helpers).
- `src/screens/` — screens named `<Name>Screen.tsx`.
- `src/components/` — reusable components.
- `src/app/` — navigation/app shell.

### Naming Conventions

- Components: `PascalCase.tsx` (e.g., `PlayerScreen.tsx`)
- Utilities and hooks: `camelCase.ts` (e.g., `apiClient.ts`, `usePlayer.ts`)
- Types: co-located with implementation files where possible

## Testing

Tests run under **Vitest** (`pnpm test`) and mirror the source structure under `test/` (`test/jobs/progress.test.ts`, `test/youtubeFeed/api.test.ts`, etc.). The pre-commit hook does not run tests by default, so run `pnpm test` before pushing. See [/openwiki/development/testing.md](/openwiki/development/testing.md).

## Development Workflow

1. Create a feature branch from `main`.
2. Make changes following the code organization patterns above.
3. Add/update i18n keys in every locale for any user-facing string.
4. Write tests for new logic and run `pnpm test`.
5. Determine the commit type from the changed files (see the checklist below).
6. Let the `.husky/commit-msg` hook validate format and type.

Pre-commit self-check (from `AGENTS.md`):

1. Did I change app source code? Yes → `feat`/`fix`/`perf`/`refactor`; No (only scripts/config/CI/docs) → `build`/`ci`/`chore`/`docs`/`test`.
2. Is the type in the whitelist? If not, commitlint blocks the commit.
3. Is the header ≤ 100 characters?

## References

- **Commit conventions:** `AGENTS.md`
- **Commitlint config:** `commitlint.config.cjs`
- **Type guard script:** `scripts/commit-type-guard.mjs`
- **Git hooks:** `.husky/commit-msg`, `.husky/pre-commit`
- **i18n:** `src/i18n/`
- **Release workflow:** [/openwiki/operations/release.md](/openwiki/operations/release.md)
