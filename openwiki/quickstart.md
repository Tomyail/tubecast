---
type: "Reference"
title: "TubeCast Documentation"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-02T21:24:07.674Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.5.0", at: "2026-09-02T21:24:07.674Z" }
---


# TubeCast Documentation

TubeCast is an independent Expo / React Native client for iOS and Android that turns YouTube channels into a personal, audio-first listening library. It is not affiliated with YouTube.

## How to Use This Wiki

This wiki is an optional **just-in-time evidence index**, not required startup reading. It mirrors the framing declared in `/AGENTS.md`:

- **Source code and tests are authoritative.** Treat the wiki as a navigation aid; when a page and the source disagree, the source wins.
- **Prefer the narrowest quiet validation** that proves the changed behavior, and preserve complete failure output. Each page lists focused validation commands where applicable — run those, not a broad repo-wide sweep, unless a specific boundary (public API, generated artifact, release) requires more.

## Task-Routing Map

| If you're working on... | Start here |
|---|---|
| App entry points (`App.tsx`, `index.ts`), provider stack, theming, navigation, native layer (config plugins, iOS share extension) | [Architecture Overview](architecture/overview.md) |
| Playback engine (expo-audio), MiniPlayer, library/download management, playback state flow through providers to screens | [Playback & Library](features/playback-library.md) |
| Commit conventions, version-bump rules, i18n, code organization | [Development Conventions](development/conventions.md) |
| Vitest setup, choosing the narrowest focused test | [Testing Guide](development/testing.md) |
| Release and distribution: `scripts/release.mjs` commands, EAS build profiles, fastlane store metadata, TestFlight flow, changelog/versioning | [Release Operations](operations/release.md) |

## Canonical Toolchain

- **pnpm** — the package manager; `package.json` pins `packageManager: pnpm@10.28.1`.
- **Expo ~56 / React Native 0.85** — the SDK and runtime (`expo ~56.0.12`, `react-native 0.85.3`, `react 19.2.3`).
- **Requirements**: Node.js 20 or later, pnpm 10.

```bash
pnpm install
pnpm start        # Expo dev server (Expo Go)
pnpm ios          # native iOS dev build
pnpm android      # native Android dev build
```

## Project Structure

```
mobile/
├── src/
│   ├── app/              # Navigation, theme, providers
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules (player, playlist, youtubeFeed, demoMode)
│   ├── screens/          # Screen components
│   ├── i18n/             # Internationalization
│   └── shared/           # Shared utilities (apiClient, errors, imageSource)
├── scripts/              # Release and build scripts (release.mjs)
├── fastlane/             # App Store metadata and screenshots
├── ios/                  # iOS native project (generated via expo prebuild)
├── screenshot-assets/    # Demo mode assets (URL-referenced, not bundled)
└── assets/               # App icons and artwork (bundled)
```

## Key Technologies

- **React Navigation** — bottom tabs and native stack navigation
- **@tanstack/react-query** — data fetching and caching
- **expo-audio** — background audio playback with lock-screen controls
- **Vitest** — unit tests (`pnpm test`)
- **Fastlane** — App Store metadata, screenshots, TestFlight distribution
- **commitlint / husky / commit-and-tag-version** — commit and version-bump automation

## Local Builds

TubeCast builds locally; it does not require EAS. `pnpm release:ios` asserts no demo assets are bundled, runs `expo prebuild` for iOS, then installs a Release build on a connected device. Android release builds use `expo prebuild --platform android` and `./gradlew assembleRelease`. See [Release Operations](operations/release.md) for the full TestFlight pipeline.
