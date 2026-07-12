# Feature Modules

TubeCast is organized into feature modules under `/src/features/`. Each module encapsulates its own state, API, storage, and UI logic.

## Core Features

### Audio Player (`/src/features/player/`)

Manages audio playback with Expo Audio, background support, and lock-screen controls.

**Key files:**
- `context.tsx` - Player state and playback actions (play, pause, seek, next/previous)
- `state.ts` - Player reducer, phases (idle, loading, playing, error), and playback source types
- `useProgress.ts` - High-frequency playback progress (100ms updates)

**Features:**
- Play/pause, seek, next/previous track
- Background playback with lock-screen metadata
- Persistent mini-player above tab bar
- Progress persistence per track (saved every 5 seconds)
- Automatic cache fetch when playing unconverted tracks
- Demo mode integration (uses fixed demo tracks when enabled)

**Playback sources:**
- Local cached audio files (preferred)
- Remote audio URLs (for already-converted tracks)
- Demo tracks (screenshot mode only)

Source: `/src/features/player/context.tsx`

### Playlist (`/src/features/playlist/`)

Manages the user's local audio library and playlist.

**Key files:**
- `storage.ts` - AsyncStorage backend for tracks (add, update, delete, reorder)
- `context.tsx` - Playlist state (tracks, filters, bulk operations)

**Features:**
- Add/remove tracks from playlist
- Reorder tracks with drag-and-drop
- Mark tracks as played/unplayed
- Filter unplayed tracks only
- Bulk delete multiple tracks
- Swipe-to-delete individual tracks
- Play count tracking
- Last played timestamps

**Track data model:**
```typescript
type Track = {
  id: string;
  jobId: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: AppImageSource;
  localPath: string | null;
  localFilename: string | null;
  sourceUrl: string;
  fileSize: number;
  contentType: string;
  downloadedAt: string | null;
  cacheStatus: "cached" | "expired" | "failed" | null;
  cacheError: string | null;
  playCount: number;
  lastPlayedAt: string | null;
  channelId: string;
  channelName: string;
};
```

Source: `/src/features/playlist/storage.ts`

### YouTube Feed (`/src/features/youtubeFeed/`)

Manages YouTube channel subscriptions and feed fetching.

**Key files:**
- `api.ts` - Backend API for feed data, channel metadata, conversions
- `feed.ts` - Feed aggregation and caching logic
- `storage.ts` - Subscribed channels persistence
- `hooks.ts` - React Query hooks (`useFeedQuery`, `useChannelQuery`)
- `types.ts` - Feed types (FeedSource, FeedItem, FeedItemWithStatus)
- `input.ts` - YouTube URL/handle validation and parsing

**Features:**
- Subscribe/unsubscribe to YouTube channels
- Fetch recent uploads from subscribed channels
- Parse YouTube URLs and handles
- Convert YouTube videos to audio (via backend)
- Track conversion job status (queued, downloading, transcoding, saved, failed)

**Feed data models:**
```typescript
type FeedSource = {
  platform: "youtube";
  platformSourceId: string;
  title: string;
  thumbnailUrl: AppImageSource | null;
  sourceUrl: string | null;
  addedAt?: string;
};

type FeedItem = {
  platform: "youtube";
  platformItemId: string;
  platformSourceId: string;
  title: string;
  sourceTitle: string;
  thumbnailUrl: AppImageSource | null;
  publishedAt: string;
  sourceUrl: string;
};

type FeedItemWithStatus = FeedItem & {
  status: "new" | "converting" | "ready" | "failed";
  jobId?: string;
};
```

Source: `/src/features/youtubeFeed/types.ts`

### Conversion Jobs (`/src/features/jobs/`)

Tracks audio conversion jobs and their progress.

**Key files:**
- `api.ts` - Job status and download URLs from backend
- `hooks.ts` - React Query hooks for job queries
- `progress.ts` - Progress bar calculations and UI helpers
- `track.ts` - Job lifecycle tracking (queued → downloading → transcoding → saved/failed)
- `cache.ts` - Local cache management for converted audio
- `errors.ts` - Job-specific error types

**Job states:**
- `queued` - Waiting to be processed
- `downloading` - Audio is being downloaded
- `transcoding` - Audio is being converted
- `saved` - Ready to play
- `failed` - Conversion failed (with retry option)

**Features:**
- Poll job status every 2 seconds
- Cancel active job queries on unmount
- Calculate progress percentage for UI
- Retry failed conversions
- Delete expired audio files

Source: `/src/features/jobs/progress.ts`

### Discover (`/src/features/discover/`)

Home screen discovery content and recommendations.

**Key files:**
- `api.ts` - Backend API for featured content
- `hooks.ts` - React Query hooks
- `types.ts` - Discover content types
- `cache.ts` - Discover content caching

**Features:**
- Fetch featured channels and playlists
- Display hero cards on home screen
- Demo mode integration (fixed content for screenshots)

Source: `/src/features/discover/api.ts`

## Supporting Features

### Demo Mode (`/src/features/demoMode/`)

Screenshot demo mode for App Store assets.

**Key files:**
- `config.ts` - Environment variable check (`EXPO_PUBLIC_SCREENSHOT_DEMO_MODE`)
- `data.ts` - Fixed demo tracks, channels, discover content, covers

**How it works:**
- Activated only when `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1`
- Replaces all network/storage calls with fixed demo data
- Uses URL-referenced cover images from `screenshot-assets/demo-covers/`
- Provides consistent, review-safe content for screenshots

**Demo covers URL:**
```
https://raw.githubusercontent.com/Tomyail/tubecast/main/mobile/screenshot-assets/demo-covers
```

Override with `EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL` for local previews.

Source: `/src/features/demoMode/config.ts`

### Remote Config (`/src/features/remoteConfig/`)

Server-side feature flags and configuration.

**Key files:**
- `context.tsx` - Remote config provider and hooks

**Features:**
- Fetch feature flags from server
- Toggle features without app updates
- A/B testing support

Source: `/src/features/remoteConfig/context.tsx`

### Share Links (`/src/features/shareLinks/`)

Deep linking and share sheet integration.

**Key files:**
- `links.ts` - Parse `tubecast://listen/<trackId>` and `tubecast://open?url=...` URLs
- `matching.ts` - Match YouTube URLs to local tracks
- `momentsApi.ts` - iOS share extension "moments" (link previews)

**Features:**
- Open YouTube links from iOS share extension
- Deep link into player from web URLs
- Match shared URLs to existing tracks
- Create playable moments from links

Source: `/src/features/shareLinks/links.ts`

### Settings (`/src/features/settings/`)

User preferences and app settings.

**Key files:**
- `storage.ts` - Persist settings to AsyncStorage
- `context.tsx` - Settings provider and hooks

**Settings:**
- Theme preference (light, dark, system)
- Language preference (English, Simplified Chinese, Traditional Chinese)

Source: `/src/features/settings/storage.ts`

### Audio Export (`/src/features/audioExport/`)

Audio file export and naming utilities.

**Key files:**
- `exportFile.ts` - File export logic
- `filename.ts` - Safe filename generation

**Features:**
- Export audio files for sharing
- Sanitize filenames for filesystem safety

Source: `/src/features/audioExport/filename.ts`

## Feature Module Patterns

Each feature module follows consistent patterns:

1. **API layer** (`api.ts`) - Backend communication
2. **Storage layer** (`storage.ts`) - Local persistence
3. **React Query hooks** (`hooks.ts`) - Data fetching and caching
4. **Context provider** (`context.tsx`) - State management
5. **Types** (`types.ts`) - TypeScript types and interfaces

This separation keeps features independent and testable.
