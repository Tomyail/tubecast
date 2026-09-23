---
type: "Reference"
title: "TubeCast Documentation"
description: "Entry point for the TubeCast wiki: toolchain, how to run the app, and a task-routing map to the architecture, features, development, and operations pages."
tags: [quickstart, toolchain, task-routing, expo, react-native]
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-08140b0b026a34cde5d2e598
    resource: repo://src/features/kickstartExchange/config.ts
generated: { by: "openwiki/0.6.0", at: "2026-09-23T21:51:54.008Z" }
verified:
  - by: openwiki/0.6.0
    at: 2026-09-23T21:51:54.008Z
---

# TubeCast Documentation

TubeCast is an independent Expo / React Native client for iOS and Android that turns YouTube channels into a personal, audio-first listening library. It is not affiliated with YouTube.

## How to Use This Wiki

This wiki is an optional **just-in-time evidence index**, not required startup reading. It mirrors the framing declared in `/AGENTS.md` (OpenWiki block):

- **Don't enumerate, preload, or search wikis at task start.** Use retrieval only when the user asks, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty — then stop once the question is grounded.
- **Source code and tests are authoritative.** Treat the wiki as a navigation aid; when a page and the source disagree, the source wins. A brief's unknowns and review items are verification gaps, not automatic requirements.
- **Prefer the narrowest quiet validation** that proves the changed behavior, and preserve complete failure output. Each page lists focused validation commands where applicable — run those, not a broad repo-wide sweep.
- The wiki is refreshed by a scheduled OpenWiki GitHub Actions workflow; do not hand-edit generated pages unless explicitly asked.

## Task-Routing Map

| If you're working on... | Start here |
|---|---|
| App entry points (`App.tsx`, `index.ts`), provider stack, theming, navigation, native layer (config plugins, iOS share extension) | [Architecture Overview](architecture/overview.md) |
| Map of feature modules under `src/features` (appReview, audioExport, demoMode, discover, jobs, kickstartExchange, player, playlist, remoteConfig, settings, shareLinks, youtubeFeed) | [Feature Modules](features/overview.md) |
| Feed → job → cache conversion flow: jobs API, progress tracking, audio conversion/cache lifecycle, errors | [Conversion Pipeline](features/conversion-pipeline.md) |
| Playback engine (expo-audio), player state machine, progress persistence, playlist library, cache status lifecycle | [Playback & Library](features/playback-library.md) |
| YouTube subscriptions, feed fetching and caching, discover surfaces | [Subscriptions & Feed](features/subscriptions-feed.md) |
| Commit conventions, version-bump rules, i18n, code organization | [Development Conventions](development/conventions.md) |
| Vitest setup, test layout under `test/`, choosing the narrowest focused test | [Testing Guide](development/testing.md) |
| `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE` operation, demo tracks, store screenshot generation (`scripts/generate-store-screenshots.swift`) | [Demo Mode & Store Screenshots](operations/demo-mode-screenshots.md) |
| Release and distribution: `scripts/release.mjs` commands, fastlane store metadata, TestFlight flow, changelog/versioning | [Release Operations](operations/release.md) |

## Canonical Toolchain

- **pnpm** — the package manager; `package.json` pins `packageManager: pnpm@10.28.1`.
- **Expo ~56 / React Native 0.85** — the SDK and runtime (`expo ~56.0.12`, `react-native 0.85.3`, `react 19.2.3`).
- **Requirements**: Node.js 20 or later, pnpm 10, and Expo Go for quick runs or Xcode / Android Studio for native builds.

```bash
pnpm install
pnpm start        # Expo dev server (Expo Go)
pnpm ios          # native iOS dev build
pnpm android      # native Android dev build
pnpm test         # Vitest unit tests
```

Screenshot demo mode variants (`start:screenshots`, `ios:screenshots`, `ios:screenshots:release`, `ios:screenshots:ipad`) set `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1`; see [Demo Mode & Store Screenshots](operations/demo-mode-screenshots.md).

## Project Structure

```
mobile/
├── src/
│   ├── app/              # Navigation, theme, providers
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules (appReview, audioExport, demoMode, discover,
│   │                     #   jobs, kickstartExchange, player, playlist, remoteConfig,
│   │                     #   settings, shareLinks, youtubeFeed)
│   ├── screens/          # Screen components
│   ├── i18n/             # Internationalization (i18next, EN / zh-CN)
│   └── shared/           # Shared utilities (apiClient, errors, imageSource)
├── scripts/              # Release, versioning, and screenshot scripts (release.mjs)
├── fastlane/             # App Store metadata and screenshots
├── ios/                  # iOS native project (generated via expo prebuild)
├── screenshot-assets/    # Demo mode assets (URL-referenced, not bundled)
└── assets/               # App icons and artwork (bundled)
```

## Key Technologies

- **React Navigation** — bottom tabs and native stack navigation
- **@tanstack/react-query** — data fetching and caching
- **expo-audio** — background audio playback with lock-screen controls
- **@tomyail/react-native-kickstart-exchange** — iOS share-extension data exchange
- **Vitest** — unit tests (`pnpm test`)
- **Fastlane** (via `mise exec`) — App Store metadata, screenshots, TestFlight distribution
- **commitlint / husky / commit-and-tag-version** — commit and version-bump automation

## Local Builds

TubeCast builds locally; it does not require EAS. `pnpm release:ios` runs `scripts/release.mjs assert-no-demo-assets`, then `expo prebuild --platform ios --no-install`, then installs a Release build on a connected device. Android release builds use `expo prebuild --platform android` and `./gradlew assembleRelease`. See [Release Operations](operations/release.md) for the full TestFlight pipeline.
