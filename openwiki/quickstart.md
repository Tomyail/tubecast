---
type: Documentation Hub
title: TubeCast Documentation
description: TubeCast is an independent Expo / React Native client for iOS and Android that turns YouTube channels into a personal, audio-first listening library.
tags: [tubecast, expo, react-native, mobile-app, documentation]
---

# TubeCast Documentation

TubeCast is an independent Expo / React Native client for iOS and Android that turns YouTube channels into a personal, audio-first listening library.

## How to Use This Wiki

This wiki is an optional **just-in-time evidence index**, not required startup reading. It mirrors the framing declared in `/AGENTS.md`:

- **Source code and tests are authoritative.** Treat the wiki as a navigation aid; when a page and the source disagree, the source wins. Items flagged as unknowns or review notes are verification gaps to confirm, not automatic requirements.
- **Prefer the narrowest quiet validation** that proves the changed behavior, and preserve complete failure output. Each page lists focused validation commands where applicable — run those, not a broad repo-wide sweep, unless a specific boundary (public API, generated artifact, release) requires more.

## What This Wiki Covers

This documentation covers the TubeCast mobile app implementation across:
- **Architecture** - Expo/React Native app structure, navigation, and core systems
- **Features** - Audio conversion, YouTube feeds, playlist management, player, and demo mode
- **Release Workflows** - CI-driven TestFlight pipeline (EAS Build/Submit + fastlane distribute), App Store metadata, and versioning
- **Development Practices** - Commit conventions (AGENTS.md), testing, and AI agent guidance

## Quick Navigation

- **[Architecture Overview](architecture/overview.md)** - App structure, navigation, and state management
- **[Feature Modules](features/overview.md)** - Player, playlist, YouTube feed, discover, and demo mode
- **[Release & Distribution](operations/release.md)** - TestFlight builds, App Store metadata, and versioning
- **[Development Guide](development/conventions.md)** - Commit message conventions and AI agent guidance

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
├── scripts/              # Release and build scripts
├── fastlane/             # App Store metadata and screenshots
├── ios/                  # iOS native project (generated via expo prebuild)
├── screenshot-assets/    # Demo mode assets (URL-referenced, not bundled)
└── assets/               # App icons and artwork (bundled)
```

## Key Technologies

- **Expo / React Native** - Cross-platform mobile framework
- **React Navigation** - Bottom tabs and native stack navigation
- **@tanstack/react-query** - Data fetching and caching
- **Expo Audio** - Background audio playback with lock-screen controls
- **EAS Build / Submit** - Cloud iOS builds and TestFlight upload (CI-driven)
- **Fastlane** - App Store metadata, screenshots, and TestFlight distribution
- **GitHub Actions** - Automated TestFlight release pipeline
- **pnpm** - Package management

## Development Setup

### Requirements

- Node.js 20+
- pnpm 10
- Xcode (for iOS builds) or Android Studio (for Android builds)

### Run in Development

```bash
pnpm install
pnpm start          # Start Expo dev server
pnpm ios            # Run on iOS simulator
pnpm android        # Run on Android emulator
```

### Screenshot Demo Mode

Demo mode is used for App Store screenshots. It replaces real user data with fixed demo content:

```bash
EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1 pnpm start
EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1 pnpm run:ios
```

Demo mode only activates when `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1` is set. Normal development, TestFlight, and App Store builds use real user data.

**Important**: Demo assets in `screenshot-assets/demo-covers/` are referenced by URL, not bundled into the IPA. This keeps production builds small.

### iOS Release Builds

Releasing to TestFlight is CI-driven. The only manual step is `pnpm release:version` (which bumps the marketing version + buildNumber, tags `vX.Y.Z`, and pushes). Pushing the tag triggers `.github/workflows/release-testflight.yml`, which builds the IPA with EAS Build, uploads via `eas submit`, distributes to TestFlight, and promotes the GitHub Release — no manual Archive or App Store Connect clicks. See [Release Operations](operations/release.md) for the full pipeline, CI prerequisites, and the local fastlane fallback.

```bash
pnpm release:ios    # Local Release build for on-device testing (not the CI release path)
```

## Version Status

- **Current Version**: 1.2.0
- **iOS Build Number**: 13
- **Distribution**: TestFlight beta only (no public Android release)

## Important Notes

- **Commit Conventions**: Follow the rules in `/AGENTS.md`. Commit types (`feat`, `fix`, `build`, etc.) directly drive version bumps. Using `feat` or `fix` for toolchain changes will incorrectly bump the App Store version.
- **Demo Mode Assets**: Never move files from `screenshot-assets/` into `assets/`. Bundled demo assets increase IPA size unnecessarily.
- **Local Builds**: Local development builds use Xcode/Android Studio. Production TestFlight builds are produced by EAS Build in CI (see [Release Operations](operations/release.md)).

## Next Steps

1. Read the [Architecture Overview](architecture/overview.md) to understand the app structure
2. Review [Development Conventions](development/conventions.md) before making changes
3. Check [Release & Distribution](operations/release.md) for TestFlight and App Store workflows
