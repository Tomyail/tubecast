# Release Operations

This document covers TubeCast release workflows, including TestFlight distribution, App Store metadata, and version management.

## Prerequisites

### Tools

- **fastlane** - Ruby gem for iOS automation (managed via `mise` and `Gemfile`)
- **mise** - Task runner and version manager (`.mise.toml`)
- **Expo CLI** - For prebuild and native project generation
- **Xcode** - For iOS builds and archives

### Environment Variables

Required for TestFlight uploads:

```bash
# App Store Connect API Key (recommended)
APP_STORE_CONNECT_API_KEY_KEY_ID=<key_id>
APP_STORE_CONNECT_API_KEY_ISSUER_ID=<issuer_id>
APP_STORE_CONNECT_API_KEY_KEY_FILEPATH=/path/to/AuthKey_<key_id>.p8

# TestFlight distribution
TESTFLIGHT_GROUPS="Public Beta Testers"
TESTFLIGHT_CHANGELOG="What's new in this build"

# Optional IPA paths
IPA_PATH=/path/to/TubeCast.ipa
IPA_OUTPUT_DIR=build/ios
```

Source: `/fastlane/Fastfile`

## Release Script (`/scripts/release.mjs`)

The release script orchestrates version bumps, changelog generation, and TestFlight distribution.

### Architecture

The script handles three release phases:

- **Phase A** - Version bump, changelog generation, git tagging
- **Phase B** - Native project prebuild and Xcode archive (manual)
- **Phase C** - Draft release publication and repository sync

### Available Commands

```bash
# Bump buildNumber, generate changelog, create tag
pnpm release:version

# Generate expo prebuild (writes buildNumber to native)
pnpm release:archive

# Publish draft release to GitHub
pnpm release:publish

# Hotfix: bump buildNumber only (no marketing version bump)
pnpm release:rebuild

# Sync iOS native project version from app.json
pnpm release:sync-ios

# Generate changelog for TestFlight
pnpm release:changelog

# --- TestFlight workflow ---

# Bump buildNumber and commit
pnpm release:testflight-bump

# Prebuild and sync Xcode version
pnpm release:testflight-prepare

# Build IPA with fastlane
pnpm release:testflight-build

# Upload IPA to TestFlight (no distribution)
pnpm release:testflight-upload

# Generate changelog from commits
pnpm release:testflight-changelog

# Distribute to tester groups
pnpm release:testflight-distribute

# Tag and publish GitHub release
pnpm release:testflight-tag

# Full TestFlight flow (bump + build + upload + distribute)
pnpm release:testflight
```

Source: `/scripts/release.mjs`

## TestFlight Workflow

### Step-by-Step Process

#### 1. Bump Build Number

```bash
pnpm release:testflight-bump
```

This increments `ios.buildNumber` in `app.json` and commits the change.

#### 2. Prepare Native Project

```bash
pnpm release:testflight-prepare
```

This runs:
- `expo prebuild --platform ios --no-install` - Generates native iOS project
- Syncs version from `app.json` to Xcode project files

#### 3. Build IPA

```bash
pnpm release:testflight-build
```

This calls fastlane:
```ruby
fastlane ios testflight_build
```

Builds `TubeCast.ipa` in `build/ios/` using:
- Configuration: Release
- Export method: app-store
- Export options: `fastlane/ExportOptions.plist`
- Development team: G8JC6TALT6

#### 4. Upload to TestFlight

```bash
pnpm release:testflight-upload
```

This calls fastlane:
```ruby
fastlane ios testflight_upload
```

Uploads the IPA to TestFlight without distributing to testers.

#### 5. Generate Changelog

```bash
pnpm release:testflight-changelog
```

Generates `.testflight-changelog.md` from recent git commits.

#### 6. Distribute to Testers

```bash
pnpm release:testflight-distribute
```

This calls fastlane:
```ruby
fastlane ios testflight_distribute
```

Distributes the uploaded build to tester groups with changelog.

#### 7. Tag Release

```bash
pnpm release:testflight-tag
```

Creates a GitHub tag and release with the changelog.

### Combined Command

For a full TestFlight release, run:

```bash
pnpm release:testflight
```

This executes all steps (bump → prepare → build → upload → changelog → distribute → tag).

Source: `/scripts/release.mjs`

## Fastlane Actions

### Build

```bash
fastlane ios testflight_build
```

Builds an App Store IPA without uploading.

**Output:** `build/ios/TubeCast.ipa`

### Upload

```bash
fastlane ios testflight_upload
```

Uploads an existing IPA to TestFlight (no distribution).

### Distribute

```bash
fastlane ios testflight_distribute
```

Distributes an uploaded build to tester groups with changelog.

### Metadata

```bash
pnpm store:metadata
```

Uploads App Store metadata (descriptions, keywords, promotional text) for all locales.

**Locales:**
- en-US (English)
- zh-Hans (Simplified Chinese)
- zh-Hant (Traditional Chinese)

### Screenshots

```bash
pnpm store:screenshots
```

Uploads App Store screenshots for all locales.

**Screenshots are organized by device and locale:**
```
fastlane/screenshots/
├── en-US/
│   ├── 0_APP_IPHONE_65_0.png
│   ├── 0_APP_IPAD_PRO_3GEN_129_0.png
│   └── ...
├── zh-Hans/
│   └── ...
└── zh-Hant/
    └── ...
```

### Store Assets (Metadata + Screenshots)

```bash
pnpm store:assets
```

Uploads both metadata and screenshots in one command.

### Download Metadata/Screenshots

```bash
pnpm store:download-metadata
pnpm store:download-screenshots
```

Downloads current App Store metadata and screenshots to `fastlane/` for local inspection.

Source: `/fastlane/README.md`

## Version Management

### Version Components

- **Marketing version** (`app.json` → `expo.version`) - User-facing version (e.g., 1.1.0)
- **Build number** (`app.json` → `expo.ios.buildNumber`) - Integer for App Store (e.g., 10)

### Version Bumps

Marketing version bumps follow Conventional Commits via `commit-and-tag-version`:

- **feat** → minor version bump (1.0.0 → 1.1.0)
- **fix** → patch version bump (1.0.0 → 1.0.1)
- **feat! /BREAKING CHANGE** → major version bump (1.0.0 → 2.0.0)

Build numbers are incremented manually for TestFlight releases:

```bash
# Edit app.json → increment ios.buildNumber
pnpm release:testflight-bump
```

Source: `/scripts/release.mjs`

## Screenshot Demo Mode

When preparing App Store screenshots, use screenshot demo mode to avoid exposing real user data.

### Enable Demo Mode

```bash
export EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1
```

### Run with Demo Mode

```bash
# Development server with demo mode
pnpm start:screenshots

# iOS simulator (iPhone 13 Pro Max)
pnpm ios:screenshots:release

# iPad simulator (13-inch iPad Pro)
pnpm ios:screenshots:ipad
```

### Demo Mode Behavior

- Replaces all network/storage data with fixed demo content
- Uses URL-referenced cover images (not bundled into IPA)
- Provides consistent, review-safe content for screenshots
- Only active when `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1`

### Demo Assets Location

Demo covers are stored in `/screenshot-assets/demo-covers/` and referenced by URL:

```
https://raw.githubusercontent.com/Tomyail/tubecast/main/mobile/screenshot-assets/demo-covers
```

**⚠️ Important:** Do not move demo covers into `assets/`. Files in `assets/` are bundled into the IPA by Metro. Demo mode must use URL references to avoid bloating production builds.

Source: `/screenshot-assets/README.md`, `/src/features/demoMode/config.ts`

## Conventional Commits

This project uses Conventional Commits with automated version bumping and commit type guards.

See `/openwiki/development/conventions.md` for commit message rules and the `/AGENTS.md` file for AI agent guidelines.

## Checklist: Before Releasing

- [ ] Verify `app.json` version and buildNumber are correct
- [ ] Ensure no bundled demo assets in `assets/demo-covers/`
- [ ] Run tests: `pnpm test`
- [ ] Test on physical device (TestFlight or local build)
- [ ] Update `.testflight-changelog.md` or set `TESTFLIGHT_CHANGELOG`
- [ ] Verify App Store metadata translations are current
- [ ] Confirm App Store Connect API key is configured
- [ ] Tag release with semantic version

## Troubleshooting

### Build Fails

- Ensure Xcode command line tools are installed: `xcode-select --install`
- Verify development team is set in Xcode project
- Check `ExportOptions.plist` is correct for app-store exports

### Upload Fails

- Verify App Store Connect API key environment variables are set
- Check IPA exists at `build/ios/TubeCast.ipa`
- Ensure buildNumber matches uploaded build

### Demo Mode Not Working

- Confirm `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1` is set
- Check Metro bundler was restarted after setting env var
- Verify demo assets are accessible at the URL

### Version Bump Issues

- Check commits follow Conventional Commits format
- Verify `package.json` version is synced with `app.json`
- Run `pnpm release:version` to trigger version bump manually

## References

- **Release script:** `/scripts/release.mjs`
- **Fastlane config:** `/fastlane/Fastfile`
- **App metadata:** `/fastlane/metadata/`
- **Export options:** `/fastlane/ExportOptions.plist`
- **Commit conventions:** `/AGENTS.md`
- **Conventional Commits:** See `/openwiki/development/conventions.md`
