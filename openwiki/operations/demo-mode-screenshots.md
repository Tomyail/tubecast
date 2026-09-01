---
type: operations-guide
title: Demo Mode & Store Screenshots
description: How EXPO_PUBLIC_SCREENSHOT_DEMO_MODE produces deterministic screenshot builds, why demo cover art is URL-referenced instead of bundled, and how raw captures are composed and pushed to App Store Connect via fastlane.
tags: [demo-mode, screenshots, fastlane, app-store, release, assets]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-01T21:28:30.610Z
sources:
  - id: openwiki-source-7af97a29763d6f133e4b4851
    resource: repo://fastlane/Fastfile
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-724a6a78f975f00f7d71770e
    resource: repo://screenshot-assets/README.md
  - id: openwiki-source-e537f10daa0a00c27e02d92f
    resource: repo://scripts/generate-store-screenshots.swift
  - id: openwiki-source-99267eb31f174540a6c513b1
    resource: repo://scripts/release.mjs
  - id: openwiki-source-e71f3ac1cc8f93872433e109
    resource: repo://src/features/demoMode/config.ts
  - id: openwiki-source-b16234b5752aa15156e9c2c9
    resource: repo://src/features/demoMode/data.ts
  - id: openwiki-source-73242ed06ac96308eb582d63
    resource: repo://src/i18n/index.tsx
generated: { by: "openwiki/0.5.0", at: "2026-09-01T21:28:30.610Z" }
---

# Demo Mode & Store Screenshots

TubeCast's App Store screenshots are produced by a dedicated **screenshot demo mode**: a build-time flag that replaces all runtime data with deterministic fixtures, plus a compositing pipeline that turns raw device captures into localized marketing images and uploads them with fastlane `deliver`.

## Gating: `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE`

`src/features/demoMode/config.ts` exports a single boolean constant:

```ts
export const screenshotDemoMode = isTruthy(process.env.EXPO_PUBLIC_SCREENSHOT_DEMO_MODE);
```

`isTruthy` accepts `"1"`, `"true"`, or `"yes"` (case-insensitive). Because it reads `EXPO_PUBLIC_*`, the flag is inlined at JS-bundle build time — it is a *build* mode, not a runtime setting.

Every consumer checks the constant directly at its integration point:

| Consumer | Demo behavior when enabled |
|---|---|
| `src/features/playlist/context.tsx`, `src/features/player/context.tsx` | Return demo tracks / player state instead of real storage and playback |
| `src/features/discover/hooks.ts`, `src/features/youtubeFeed/hooks.ts` | Serve demo discover/feed data |
| `src/screens/HomeScreen.tsx`, `src/screens/ConvertScreen.tsx` | Deterministic home state; shows a conversion-proof component when a URL is entered |
| `src/i18n/index.tsx` | Forces the language to `EXPO_PUBLIC_SCREENSHOT_DEMO_LANGUAGE` (`zh-CN` → `zh-CN`, anything else → `en`), bypassing the stored `settings_language` preference |

The npm scripts that set the flag are defined in `package.json`:

- `start:screenshots` — dev server with demo mode
- `ios:screenshots` — `expo run:ios`
- `ios:screenshots:release` — Release build on **iPhone 13 Pro Max**
- `ios:screenshots:ipad` — Release build on **iPad Pro 13-inch (M5)**

These two physical devices match the App Store screenshot size classes consumed downstream (see below).

## Invariant: demo assets are URL-referenced, never bundled

Demo data lives in `src/features/demoMode/data.ts`. Cover thumbnails are referenced as **remote URLs**, not imported images:

```ts
const DEFAULT_DEMO_COVER_BASE_URL =
  "https://raw.githubusercontent.com/Tomyail/tubecast/main/mobile/screenshot-assets/demo-covers";
const DEMO_COVER_BASE_URL = (
  process.env.EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL || DEFAULT_DEMO_COVER_BASE_URL
).replace(/\/$/, "");
```

The raw PNGs live in `screenshot-assets/demo-covers/`, *outside* the `assets/` directory. `screenshot-assets/README.md` states the rule explicitly: anything under `assets/` can be picked up by Metro and packaged into the IPA, so demo artwork must stay in `screenshot-assets/` and be referenced by URL. This keeps production IPAs free of demo art — the demo code paths are compiled in, but the images are only fetched (in demo builds) over the network.

This invariant is enforced at release time. `package.json`'s `release:ios` runs:

```
node scripts/release.mjs assert-no-demo-assets && expo prebuild ... && expo run:ios ...
```

`assertNoBundledScreenshotDemoAssets()` in `scripts/release.mjs` fails the release if `assets/demo-covers/` exists, telling the operator to keep screenshot assets in `screenshot-assets/demo-covers` and keep demo mode on URL references.

For previewing *unpublished* covers before they hit the repo's `main` branch (the default URL points at raw GitHub `main`), run a local static server and set:

```sh
EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL=http://localhost:<port>/demo-covers
```

## Demo fixtures

`src/features/demoMode/data.ts` provides:

- `getDemoTracks()` — a playlist of 12 `Track` objects with `demo-*` ids, synthetic channels (Calm Living, Learning Lab, City Radio, Mindful Notes), mixed `cacheStatus`/`playCount` so playlist screenshots show varied states
- `getDemoDiscover()` — a `DiscoverResponse` with `recent` and a reordered `popular` list
- `getDemoFeedSources()` — podcast-style `FeedSource` entries

Track titles/channels intentionally match the strings hard-coded in the Swift compositor below, so the rendered lock-screen slide and the app captures agree.

## Screenshot composition: `scripts/generate-store-screenshots.swift`

Raw simulator captures go in `screenshot-assets/store-ui/<locale>/` (e.g. `en-US`, `zh-Hans`). The Swift/AppKit script:

1. Defines three locale copy sets: `en-US` (from `en-US` sources), `zh-Hans` (from `zh-Hans` sources), and `zh-Hant` — which **reuses `en-US` source captures** while rendering Traditional-Chinese marketing copy.
2. For each locale × device × slide (5 slides per locale):
   - Slides 0–3 load the raw capture `screenshot-assets/store-ui/<sourceLocale>/<slide>_<device>_<slide>.png`.
   - Slide 4 is **synthesized** as a Lock Screen (9:41 clock, localized date, track title/channel, progress bar, pause/skip controls, AirPlay pill) using `screenshot-assets/demo-covers/lake-reading.png` as artwork.
   - The inner image is composited into a marketing canvas: warm background + glow, "TUBECAST · 0N" eyebrow, localized title/subtitle, and a drawn device frame (iPhone hardware buttons + Dynamic Island for phone sizes; wider rounded frame for iPad).
3. Output PNGs are written to `fastlane/screenshots/<locale>/<slide>_<device>_<slide>.png`.

Device targets match the physical screenshot devices in the npm scripts:

- `APP_IPHONE_65` — 1284×2778 (6.5" class, from iPhone 13 Pro Max captures)
- `APP_IPAD_PRO_3GEN_129` — 2064×2752 (12.9" iPad Pro class)

Missing source captures or artwork are hard errors (exit 1), so the pipeline fails loudly rather than shipping gaps.

## Pushing to App Store Connect (fastlane)

`fastlane/Fastfile` defines three asset lanes (run via `mise exec -- bundle exec fastlane ...`, wrapped by `package.json` scripts `store:metadata`, `store:screenshots`, `store:assets`):

| Lane | Scope |
|---|---|
| `metadata_push` | Localized metadata from `fastlane/metadata/` only (`skip_screenshots: true`) |
| `screenshots_push` | Screenshots from `fastlane/screenshots/` only (`skip_metadata: true`, `overwrite_screenshots: true`) |
| `store_assets_push` | Both metadata and screenshots |

All three use `deliver` with `skip_binary_upload: true`, `submit_for_review: false`, `automatic_release: false`, and `force: true` — they never touch the binary or trigger review. Authentication prefers an App Store Connect API key (`APP_STORE_CONNECT_API_KEY_KEY_ID` / `_ISSUER_ID` / `_KEY_FILEPATH` env vars), falling back to `FASTLANE_USER` email auth.

`store:download-metadata` and `store:download-screenshots` use `deliver download_metadata` / `download_screenshots` to pull the live App Store state back into `fastlane/metadata/` and `fastlane/screenshots/` for diffing.

## End-to-end flow

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: a semicolon inside a label breaks rendering; rephrase the label. -->
```text
flowchart LR
    A["EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1\nexpo run:ios --configuration Release"] --> B["Simulator/device renders\ndeterministic demo UI\n(URL-referenced covers)"]
    B --> C["Raw captures into\nscreenshot-assets/store-ui/&lt;locale&gt;/"]
    C --> D["scripts/generate-store-screenshots.swift\ncompose marketing frames"]
    D --> E["fastlane/screenshots/&lt;locale&gt;/"]
    E --> F["fastlane screenshots_push\n(deliver, skip binary)"]
    G["scripts/release.mjs\nassert-no-demo-assets"] -.->|blocks if assets/demo-covers exists| H["Release IPA build"]
```

## Related pages

- [/openwiki/features/overview.md](/openwiki/features/overview.md) — the features whose hooks are stubbed in demo mode
- [/openwiki/operations/release.md](/openwiki/operations/release.md) — the release orchestration that runs `assert-no-demo-assets`
