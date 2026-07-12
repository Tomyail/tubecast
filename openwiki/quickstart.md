# TubeCast Documentation

TubeCast is an independent Expo / React Native client for iOS and Android that turns YouTube channels into a personal, audio-first listening library.

## What This Wiki Covers

This documentation covers the TubeCast mobile app implementation across:
- **Architecture** - Expo/React Native app structure, navigation, and core systems
- **Features** - Audio conversion, YouTube feeds, playlist management, player, and demo mode
- **Release Workflows** - TestFlight distribution, App Store metadata, and versioning
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
- **Fastlane** - App Store metadata and screenshot automation
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

```bash
pnpm release:ios    # Build and install Release build on device
```

Use Xcode's **Product → Archive** to create an archive for TestFlight or App Store Connect.

## Version Status

- **Current Version**: 1.1.0
- **iOS Build Number**: 10
- **Distribution**: TestFlight beta only (no public Android release)

## Important Notes

- **Commit Conventions**: Follow the rules in `/AGENTS.md`. Commit types (`feat`, `fix`, `build`, etc.) directly drive version bumps. Using `feat` or `fix` for toolchain changes will incorrectly bump the App Store version.
- **Demo Mode Assets**: Never move files from `screenshot-assets/` into `assets/`. Bundled demo assets increase IPA size unnecessarily.
- **Local Builds**: TubeCast builds locally via Xcode/Android Studio. It does not use EAS build services.

## Next Steps

1. Read the [Architecture Overview](architecture/overview.md) to understand the app structure
2. Review [Development Conventions](development/conventions.md) before making changes
3. Check [Release & Distribution](operations/release.md) for TestFlight and App Store workflows
