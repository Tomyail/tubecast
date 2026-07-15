# TubeCast

TubeCast turns YouTube channels into a personal, audio-first listening library. Follow channels, browse new uploads as episodes, save audio for offline listening, and organize it into playlists.

TubeCast is an independent Expo / React Native client for iOS and Android. It is not affiliated with YouTube.

## Screenshots

| Feed | Home | Convert |
| --- | --- | --- |
| <img alt="Subscriptions feed" src="docs/screenshots/feed.jpg" width="240"> | <img alt="Home" src="docs/screenshots/home.jpg" width="240"> | <img alt="Convert audio" src="docs/screenshots/convert.jpg" width="240"> |
| Player | Playlist | Settings |
| <img alt="Now playing" src="docs/screenshots/player.jpg" width="240"> | <img alt="Playlist" src="docs/screenshots/playlist.jpg" width="240"> | <img alt="Settings" src="docs/screenshots/settings.jpg" width="240"> |

## Features

- Convert YouTube videos into audio from a pasted URL, with clear queued, downloading, transcoding, saving, playable, failed, and expired states.
- Browse recent and popular converted videos on the Home screen, then play or cache them without leaving the app.
- Follow YouTube channels by URL or handle, manage subscriptions, and browse new uploads in a podcast-style feed.
- Open publisher previews from subscribed feeds or the player, see recent videos, subscribe or unsubscribe, and convert playable episodes.
- Cache completed audio locally for offline playback, retry failed cache jobs, and inspect local storage usage.
- Play audio with a full-screen player, draggable progress bar, previous/next controls, source links, publisher metadata, and cache status.
- Keep listening in the background with iOS lock-screen metadata and a persistent mini player above the tab bar.
- Maintain a local playlist/library with playback progress, listened state, reorder support, swipe-to-delete, bulk edit/delete, and an unplayed-only filter.
- Use light, dark, or system appearance, and switch between English, Simplified Chinese, or system language.

## Try the beta

TubeCast is available via TestFlight for iOS:

**[Join the TestFlight beta](https://testflight.apple.com/join/Pze9SjbP)**

Android is not distributed publicly at this time. See [Local builds](#local-builds) to build from source.

## Installation

### Requirements

- Node.js 20 or later
- pnpm 10
- Expo Go for quick development runs, or Android Studio / Xcode for native builds

### Run in development

```bash
pnpm install
pnpm start
```

Open the Expo development server in Expo Go, or start a native development build:

```bash
pnpm android
pnpm ios
```

### Screenshot demo mode

Use screenshot demo mode when preparing App Store screenshots. It keeps the real
UI but replaces network/storage data with fixed, English demo content and local
illustration covers:

```bash
pnpm start:screenshots
pnpm ios:screenshots
pnpm ios:screenshots:release
pnpm ios:screenshots:ipad
```

The mode is enabled only when `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1` is present.
Normal development, TestFlight, and App Store builds keep using real user data.
Use `ios:screenshots:release` for 6.5-inch App Store screenshots. It targets
the `iPhone 13 Pro Max` simulator and avoids development-only overlays such as
the floating Tools button.
Use `ios:screenshots:ipad` for the 13-inch iPad App Store screenshots. It
targets the `iPad Pro 13-inch (M5)` simulator.

## Local builds

TubeCast builds locally; it does not require EAS.

### iOS

Install Xcode, connect an unlocked iPhone, and select a signing team in the generated Xcode project. Then build and install a Release build locally:

```bash
pnpm release:ios
```

This runs `expo run:ios --device --configuration Release`. To create an archive for TestFlight or App Store Connect, use Xcode's **Product → Archive** and Organizer.

### Android

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The release APK is written to `android/app/build/outputs/apk/release/`.

If you distribute a fork, replace `expo.ios.bundleIdentifier` and `expo.android.package` in `app.json` with identifiers you own. Do not publish a fork under TubeCast's identifiers.

## Releases

Releases are cut locally — no CI builds the binary. The flow:

1. `pnpm release:version` — bumps the marketing version + `ios.buildNumber`, updates `CHANGELOG.md`, tags `vX`, pushes the tag, and opens a **draft** GitHub Release.
2. `pnpm release:archive` → Archive in Xcode (`Product → Archive`) → upload to App Store Connect via Transporter → wait for processing → add the build to the TestFlight group by hand.
3. `pnpm release:publish` — flips the GitHub Release from draft to published and bumps the root repo's submodule pointer.

For same-version TestFlight rebuilds, use the split TestFlight flow:

```bash
pnpm release:testflight-bump
pnpm release:testflight-prepare
pnpm release:testflight-build
pnpm release:testflight-upload
pnpm release:testflight-changelog
pnpm release:testflight-tag
```

`release:testflight-prepare` runs `expo prebuild --platform ios` without
`--clean` by default, preserving the existing native iOS project and share
extension. Use `EXPO_PREBUILD_CLEAN=1 pnpm release:testflight-prepare` only
when you intentionally want a clean native regeneration.

`release:testflight-upload` uploads the IPA only; it does not distribute to tester groups. To distribute an already-uploaded build to the default `Public Beta Testers` external group, pass a tester-facing changelog explicitly:

```bash
TESTFLIGHT_CHANGELOG="Test discovery, playlist playback, sharing, and settings." pnpm release:testflight-distribute
```

External tester notifications are off by default. Add `TESTFLIGHT_NOTIFY=1` when you intentionally want TestFlight to notify testers.

To offer TestFlight users an optional path to the stable App Store version, set
the campaign link only when building that TestFlight release:

```bash
export EXPO_PUBLIC_APP_STORE_CAMPAIGN_URL='https://apps.apple.com/app/apple-store/id…?pt=…&ct=testflight-migration&mt=8'
pnpm release:testflight-prepare
pnpm release:testflight-build
```

When this variable is absent or is not an `https://apps.apple.com` URL, the
startup choice and the persistent Settings link stay hidden. Do not set it for
the App Store production archive. The variable must still be present during
`release:testflight-build`, when the JavaScript bundle is generated.

Versioning follows [conventional commits](https://www.conventionalcommits.org/) via `commit-and-tag-version` (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major). TestFlight "What's New" is bilingual: English from `CHANGELOG.md`, Chinese written by hand. The first release bootstraps a baseline `v1.0.0` tag from existing history; see `plans/007-mobile-release-flow.md` for the full design.

### App Store metadata automation

App Store Connect metadata, screenshots, and TestFlight helper lanes are managed
with fastlane. The local Xcode Archive / Transporter flow remains available as a
fallback.

First-time setup:

```bash
cd mobile
mise install
mise exec -- bundle install
```

Download the current App Store Connect metadata before making broad edits:

```bash
pnpm store:download-metadata
pnpm store:download-screenshots
```

Edit files under `fastlane/metadata/<locale>/`, then upload metadata only:

```bash
pnpm store:metadata
```

Upload screenshots only:

```bash
pnpm store:screenshots
```

Upload both metadata and screenshots:

```bash
pnpm store:assets
```

The configured locales are Simplified Chinese (`zh-Hans`), English (`en-US`),
and Traditional Chinese (`zh-Hant`). Add more locales only when you intend to
maintain their keywords, description, and screenshots.

## Development

```bash
pnpm test
```

The app is deliberately separated from the backend implementation. It communicates only through the HTTP API for job submission and status, channel feeds, library records, and downloadable audio. Keep changes compatible with the existing API contract, or make the server endpoint configurable when adding new capabilities.

## License

TubeCast is licensed under the GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE).
