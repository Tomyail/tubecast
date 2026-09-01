---
type: Feature Module Collection
title: Feature Modules
description: TubeCast feature modules under /src/features/ — player, playlist, YouTube feed, jobs, discover, demo mode, remote config, share links, settings, and audio export — with responsibilities, key files, and pointers to deeper per-system pages.
tags: [features, modules, react-native, expo]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-01T21:28:30.610Z
sources:
  - id: openwiki-source-337908bfa1c86939a89f6320
    resource: repo://src/features/audioExport/hooks.ts
  - id: openwiki-source-e71f3ac1cc8f93872433e109
    resource: repo://src/features/demoMode/config.ts
  - id: openwiki-source-30cbb123fc359cfc4709a57b
    resource: repo://src/features/discover/index.ts
  - id: openwiki-source-4aa6e82d7406c1e3fd4b1bc3
    resource: repo://src/features/jobs/hooks.ts
  - id: openwiki-source-b5aec4b320e01b6025149936
    resource: repo://src/features/player/context.tsx
  - id: openwiki-source-6b261541fb6a29f9101f2b32
    resource: repo://src/features/player/state.ts
  - id: openwiki-source-1b12fa433711c80b6e12a479
    resource: repo://src/features/remoteConfig/context.tsx
  - id: openwiki-source-4a6e25fc7f6dbcef52f8da61
    resource: repo://src/features/settings/context.tsx
  - id: openwiki-source-87e10db70502e495f3240eb1
    resource: repo://src/features/settings/storage.ts
  - id: openwiki-source-5dcaf85f5d0d9305302b8180
    resource: repo://src/features/youtubeFeed/cache.ts
  - id: openwiki-source-54cb786d83a2512d7645600c
    resource: repo://src/features/youtubeFeed/types.ts
  - id: openwiki-source-80dab1f2e571b5ebc473a98d
    resource: repo://src/screens/PlayerScreen.tsx
  - id: openwiki-source-2662059b0fdb1d64706d51d2
    resource: repo://src/screens/PlaylistScreen.tsx
  - id: openwiki-source-454e0cb599eb098ff2a3d20e
    resource: repo://src/screens/SettingsScreen.tsx
generated: { by: "openwiki/0.5.0", at: "2026-09-01T21:28:30.610Z" }
---

# Feature Modules

TubeCast is organized into feature modules under `/src/features/`. Each module encapsulates its own state, API, storage, and UI logic. This page is a map over the modules; deeper treatment of each pipeline lives on the focused pages:

- [/openwiki/features/conversion-pipeline.md](/openwiki/features/conversion-pipeline.md) — feed → job → cache flow
- [/openwiki/features/playback-library.md](/openwiki/features/playback-library.md) — player and playlist internals
- [/openwiki/features/subscriptions-feed.md](/openwiki/features/subscriptions-feed.md) — subscriptions and feed caching
- [/openwiki/operations/demo-mode-screenshots.md](/openwiki/operations/demo-mode-screenshots.md) — screenshot mode operation

## Core Features

### Audio Player (`/src/features/player/`)

Manages audio playback with Expo Audio, background support, and lock-screen controls.

**Key files:**
- `context.tsx` — Player provider: playback actions (play, pause, seek, next/previous), source resolution, periodic progress persistence
- `state.ts` — Player reducer, phases (including `idle`, `resolving`, `playing`, `paused`, `error`), and playback source types

**Features:**
- Play/pause, seek, next/previous track
- Background playback (`playsInSilentMode`, `shouldPlayInBackground`, `doNotMix` audio mode)
- Per-track progress persistence to AsyncStorage under a `player_progress_<trackId>` key, saved on a fixed interval while playing; a saved position near the track end is treated as finished and restarts from 0
- Automatic cache fetch via the jobs module when playing an unconverted track
- Request-id guards so stale async play requests cannot overwrite newer playback state

**Playback sources:** local cached audio files (preferred), remote audio URLs for already-converted tracks, and fixed demo tracks in screenshot mode.

Source: `/src/features/player/context.tsx`

### Playlist (`/src/features/playlist/`)

Manages the user's local audio library.

**Key files:**
- `storage.ts` — AsyncStorage backend for tracks (add, update, delete, reorder)
- `context.tsx` — Playlist state (tracks, filters, bulk operations)

The track model (`Track`) includes `jobId`, `durationSeconds`, `localPath`/`localFilename`, `cacheStatus` (`"cached" | "expired" | "failed" | null`), `cacheError`, `playCount`, and `lastPlayedAt`. See [/openwiki/features/playback-library.md](/openwiki/features/playback-library.md) for the full type and lifecycle.

Source: `/src/features/playlist/storage.ts`

### YouTube Feed (`/src/features/youtubeFeed/`)

Manages YouTube channel subscriptions and feed fetching.

**Key files:**
- `api.ts` — Backend API for feed data, channel metadata, conversions
- `feed.ts` — Feed aggregation
- `cache.ts` — AsyncStorage feed cache (`youtube_feed_query_cache_v1`) keyed to the subscribed-channel set and valid for 24 hours; malformed, mismatched, or stale payloads are rejected
- `storage.ts` — Subscribed channels persistence
- `submittedJobsStorage.ts` — Persistence of job ids submitted from the feed so statuses survive reloads
- `hooks.ts` — React Query hooks (`useFeedQuery`, `useChannelQuery`)
- `types.ts` — Feed types (`FeedSource`, `FeedItem`, `FeedItemWithStatus` with status `new | converting | ready | failed`)
- `input.ts` — YouTube URL/handle validation and parsing

Source: `/src/features/youtubeFeed/types.ts`

### Conversion Jobs (`/src/features/jobs/`)

Tracks audio conversion jobs and their progress.

**Key files:**
- `api.ts` — Job status and download URLs from backend
- `hooks.ts` — `useSubmitJob`, `useJobStatus` (3-second polling that stops on terminal states), and `useCacheReadyJob` (auto-caches ready jobs into the playlist, with a `retryCache` path)
- `progress.ts` — Progress bar calculations and UI helpers
- `track.ts` — Build a playlist `Track` from a ready job
- `cache.ts` — Local cache management for converted audio (`ensureTrackCached`)
- `errors.ts` — Job-specific error types

**Job states:** `queued`, `downloading`, `transcoding`, `saved`/`ready`, `failed`, and `expired`.

Source: `/src/features/jobs/hooks.ts`

### Discover (`/src/features/discover/`)

Home screen discovery content.

**Key files:**
- `api.ts` — Backend API for featured content
- `hooks.ts` — React Query hooks
- `cache.ts` — Discover content caching
- `types.ts` — Discover content types
- `index.ts` — Module barrel export

Demo mode replaces network fetches with fixed discover content.

Source: `/src/features/discover/api.ts`

## Supporting Features

### Demo Mode (`/src/features/demoMode/`)

Screenshot demo mode for App Store assets.

**Key files:**
- `config.ts` — `screenshotDemoMode` flag from `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE` (accepts `1`, `true`, `yes`, case-insensitive)
- `data.ts` — Fixed demo tracks, channels, discover content, covers

When enabled it replaces network/storage calls with fixed demo data (see [/openwiki/operations/demo-mode-screenshots.md](/openwiki/operations/demo-mode-screenshots.md)). Cover images are URL-referenced; the base URL defaults to the GitHub raw `screenshot-assets/demo-covers/` folder and can be overridden with `EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL` for local previews.

Source: `/src/features/demoMode/config.ts`

### Remote Config (`/src/features/remoteConfig/`)

Server-side feature flags.

**Key files:**
- `context.tsx` — `RemoteConfigProvider` and `useRemoteConfig`

Exposes two flags, `linkProcessingEnabled` and `audioExportEnabled` (both default `true`). The provider fetches JSON from `EXPO_PUBLIC_MOBILE_CONFIG_URL` (falling back to `${SERVER_URL}/api/mobile-config`, trying both if they differ), busts caches via a timestamp query param, and keeps the built-in defaults if all fetches fail. `audioExportEnabled` gates the export/share UI on the player and playlist screens.

Source: `/src/features/remoteConfig/context.tsx`

### Share Links (`/src/features/shareLinks/`)

Deep linking and share sheet integration.

**Key files:**
- `links.ts` — Parse `tubecast://listen/<trackId>` and `tubecast://open?url=...` URLs
- `matching.ts` — Match YouTube URLs to local tracks
- `momentsApi.ts` — iOS share extension "moments" (link previews)

Source: `/src/features/shareLinks/links.ts`

### Settings (`/src/features/settings/`)

Currently a thin module.

**Key files:**
- `storage.ts` — Exports `SERVER_URL` (`EXPO_PUBLIC_SERVER_URL`, defaulting to `https://yt-audio.tomyail.com`); consumed by the remote-config fallback and other API layers
- `context.tsx` — `SettingsProvider`/`useSettings` stub with an empty settings object

Theme preference now lives in the app theme layer (`useAppTheme`, used by `SettingsScreen.tsx`), not in this module. The **Manage Channels** screen is `/src/screens/ManageChannelsScreen.tsx` with layout utilities in `/src/screens/manageChannelsLayout.ts`.

Source: `/src/features/settings/storage.ts`

### Audio Export (`/src/features/audioExport/`)

Audio file export and sharing.

**Key files:**
- `hooks.ts` — `useTrackAudioExport`: ensures the track is cached (fetching the job if needed) before sharing; surfaces `exportingTrackId` and failure alerts
- `exportFile.ts` — File export / share-sheet logic
- `filename.ts` — Safe filename generation

Gated at the UI level by the remote-config flag `audioExportEnabled`.

Source: `/src/features/audioExport/hooks.ts`

## Feature Module Patterns

Most modules follow consistent patterns:

1. **API layer** (`api.ts`) — Backend communication
2. **Storage layer** (`storage.ts` / `cache.ts`) — Local persistence and cached reads
3. **React Query hooks** (`hooks.ts`) — Data fetching and caching
4. **Context provider** (`context.tsx`) — State management
5. **Types** (`types.ts`) — TypeScript types and interfaces

This separation keeps features independent and testable.
