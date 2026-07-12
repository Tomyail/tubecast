# Architecture Overview

TubeCast is an Expo / React Native app with a feature-based architecture. This document explains the app structure, navigation, and core systems.

## App Structure

### Technology Stack

- **Expo SDK 50+** - Managed React Native with native modules
- **React Navigation 7** - Bottom tabs and native stack navigation
- **@tanstack/react-query 5** - Data fetching, caching, and state synchronization
- **Expo Audio** - Background playback with lock-screen controls
- **AsyncStorage** - Local data persistence (channels, playlists, jobs)
- **Expo Localization** - i18n with English, Simplified Chinese, Traditional Chinese

### Directory Layout

```
src/
├── app/                    # App-level configuration
│   ├── navigation/         # React Navigation setup (RootNavigator, types)
│   ├── providers/          # Context providers (AppProviders wrapper)
│   ├── theme.tsx           # Theme definitions (light/dark)
│   └── theme-preference.ts # Theme persistence
├── components/             # Shared UI components
│   ├── DiscoverCard.tsx    # Home/Discover card component
│   ├── MiniPlayer.tsx      # Persistent mini-player above tab bar
│   ├── EmptyState.tsx      # Empty state illustrations
│   └── ...                 # Other reusable components
├── features/               # Feature modules
│   ├── audioExport/        # Audio file export and naming
│   ├── demoMode/           # Screenshot demo mode (fixed data)
│   ├── discover/            # Home screen discovery content
│   ├── jobs/               # Conversion job tracking and progress
│   ├── player/             # Audio playback state and controls
│   ├── playlist/           # Local playlist/library storage
│   ├── remoteConfig/       # Remote feature flags
│   ├── settings/           # User settings persistence
│   ├── shareLinks/         # tubecast:// URL parsing and moments
│   └── youtubeFeed/        # YouTube feed, channels, conversions
├── screens/                # Screen components (one per route)
├── i18n/                   # Translations and formatters
└── shared/                 # Shared utilities
    ├── apiClient.ts        # Axios wrapper with timeout
    ├── errors.ts           # Error types and factories
    └── imageSource.ts     # Image source type helpers
```

## Navigation Structure

The app uses a nested navigator structure:

```
RootStackNavigator
├── HomeStack (Tab)
│   └── HomeScreen
├── FeedStack (Tab)
│   └── FeedScreen
├── PlaylistStack (Tab)
│   └── PlaylistScreen
├── SettingsStack (Tab)
│   └── SettingsScreen
├── ConvertScreen           # Modal for pasting YouTube URLs
├── PlayerScreen            # Full-screen audio player (modal)
├── AddChannelScreen        # Add channel by URL/handle
├── ManageChannelsScreen   # Manage subscriptions
└── PublisherPreviewSheet   # Channel preview modal
```

### Key Navigation Flows

- **Deep Linking**: Handles `tubecast://listen/<trackId>` and `tubecast://open?url=...` URLs
- **Mini Player**: Tapping the mini player (above tab bar) opens `PlayerScreen`
- **Channel Discovery**: Channel cards from Home/Feed open `PublisherPreviewSheet`
- **Share Extension**: iOS share extension sends YouTube URLs via deep linking

Source: `/src/app/navigation/RootNavigator.tsx`

## State Management

### React Query for Data

Most data fetching uses `@tanstack/react-query`:

- **YouTube feeds**: `useFeedQuery()`, `useChannelQuery()` in `/src/features/youtubeFeed/hooks.ts`
- **Discover content**: `useDiscoverQuery()` in `/src/features/discover/hooks.ts`
- **Conversion jobs**: `useJobsQuery()` in `/src/features/jobs/hooks.ts`

React Query provides:
- Automatic background refetching
- Request deduplication
- Cache management
- Optimistic updates

### Context APIs

Feature-specific state is managed with React Context:

- **Player**: `/src/features/player/context.tsx` - Playback state, current track, progress
- **Playlist**: `/src/features/playlist/context.tsx` - Track list, filters, edits
- **Settings**: `/src/features/settings/context.tsx` - Theme, language preferences
- **Remote Config**: `/src/features/remoteConfig/context.tsx` - Feature flags from server

### Local Storage

AsyncStorage persists user data:

- **Subscribed channels**: `/src/features/youtubeFeed/storage.ts`
- **Playlist tracks**: `/src/features/playlist/storage.ts`
- **Conversion jobs**: `/src/features/youtubeFeed/submittedJobsStorage.ts`
- **Settings**: `/src/features/settings/storage.ts`

## Theming

The app supports light, dark, and system appearance:

- **Theme definitions**: `/src/app/theme.tsx`
- **Theme preference**: `/src/app/theme-preference.ts` (persists to AsyncStorage)
- **Components**: Use `useAppTheme()` hook to access colors and typography

## Screenshot Demo Mode

Demo mode is activated via `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1`:

- **Config**: `/src/features/demoMode/config.ts` - Environment variable check
- **Data**: `/src/features/demoMode/data.ts` - Fixed demo tracks, channels, discover content
- **Assets**: Referenced by URL from `screenshot-assets/demo-covers/` (not bundled)

Demo mode replaces network/storage calls with fixed data, allowing consistent App Store screenshots without real user content.

## Error Handling

- **API client**: `/src/shared/apiClient.ts` - Axios wrapper with timeout and error factories
- **Error types**: `/src/shared/errors.ts` - Custom error classes (NetworkError, TimeoutError, etc.)
- **Job errors**: `/src/features/jobs/errors.ts` - Conversion-specific error types

## Build and Native Projects

### Expo Prebuild

The app uses `expo prebuild` to generate native projects:

- **iOS**: `/ios/` directory (Xcode project)
- **Android**: `/android/` directory (Gradle project)

Run `expo prebuild --platform ios` after:
- Installing new Expo modules
- Changing `app.json` config
- Modifying plugins

### Release Script

`/scripts/release.mjs` orchestrates TestFlight builds:
- Bumps `buildNumber` in `app.json`
- Syncs version to native Xcode project
- Generates changelog from commits
- Manages TestFlight distribution

See `/openwiki/operations/release.md` for detailed release workflows.

## AI Agent Guidance

This repository includes agent-specific conventions in `/AGENTS.md`:
- Commit message format (Conventional Commits)
- Type classification rules (feat, fix, build, docs, etc.)
- File-aware commit type guard (prevents `feat` for toolchain changes)

Read `/openwiki/development/conventions.md` for detailed development guidelines.
