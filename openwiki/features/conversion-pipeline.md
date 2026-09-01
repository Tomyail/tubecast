---
type: feature
title: Conversion Pipeline
description: End-to-end YouTube-to-audio flow — URL submission (paste or deep link), server job lifecycle and polling, progress display, local audio caching, track creation, and audio export, with remote-config kill switches.
tags: [conversion, jobs, caching, audio-export, remote-config]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-01T21:28:30.610Z
sources:
  - id: openwiki-source-ad9a6a9aa0ff64c915ac5bbb
    resource: repo://src/app/navigation/RootNavigator.tsx
  - id: openwiki-source-d853b9c2fce69673dadca905
    resource: repo://src/features/audioExport/exportFile.ts
  - id: openwiki-source-697c660b80d8f1de9f2e11b1
    resource: repo://src/features/audioExport/filename.ts
  - id: openwiki-source-337908bfa1c86939a89f6320
    resource: repo://src/features/audioExport/hooks.ts
  - id: openwiki-source-2cc4f151020fa3dcef22c3a6
    resource: repo://src/features/jobs/api.ts
  - id: openwiki-source-5a85cc20244c6afe3fc389a6
    resource: repo://src/features/jobs/cache.ts
  - id: openwiki-source-126c7084bd3f93948e72c556
    resource: repo://src/features/jobs/errors.ts
  - id: openwiki-source-4aa6e82d7406c1e3fd4b1bc3
    resource: repo://src/features/jobs/hooks.ts
  - id: openwiki-source-992512a6980d0139212dda1e
    resource: repo://src/features/jobs/progress.ts
  - id: openwiki-source-d11fb2dd906b751e324db065
    resource: repo://src/features/jobs/track.ts
  - id: openwiki-source-1b12fa433711c80b6e12a479
    resource: repo://src/features/remoteConfig/context.tsx
  - id: openwiki-source-92058c19cfc40db567c4c326
    resource: repo://src/features/shareLinks/links.ts
  - id: openwiki-source-a395f38128864deed6b3edd3
    resource: repo://src/features/shareLinks/matching.ts
  - id: openwiki-source-0153bfa9d1d97b64a1431674
    resource: repo://src/screens/ConvertScreen.tsx
  - id: openwiki-source-80dab1f2e571b5ebc473a98d
    resource: repo://src/screens/PlayerScreen.tsx
  - id: openwiki-source-2662059b0fdb1d64706d51d2
    resource: repo://src/screens/PlaylistScreen.tsx
  - id: openwiki-source-2af6bf29785d5384877aa32d
    resource: repo://src/shared/apiClient.ts
  - id: openwiki-source-dddd7069eb05d92ea09c7778
    resource: repo://test/audioExport/filename.test.ts
  - id: openwiki-source-08f45ffb365cf2c809e31d28
    resource: repo://test/jobs/cache.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-01T21:28:30.610Z" }
---

# Conversion Pipeline

The conversion pipeline turns a YouTube URL into a playable, locally cached audio track. It spans URL intake (manual paste or TubeCast deep link), a server-side job that downloads/transcodes/uploads the audio, client-side polling of that job, automatic download of the finished audio into app storage, creation of a library `Track`, and optional export/share of the cached file. Two remote-config flags — `linkProcessingEnabled` and `audioExportEnabled` — act as server-controlled kill switches for intake and export respectively.

## URL intake

Two entrypoints feed the pipeline:

- **Manual paste** — `ConvertScreen` (`src/screens/ConvertScreen.tsx`) shows a URL field with a clipboard paste button. Submitting calls `useSubmitJob`, which POSTs `{ sourceUrl }` to `/api/jobs` via `submitJob` in `src/features/jobs/api.ts` and stores the returned job id in AsyncStorage under `pending_job_id` so an interrupted conversion resumes on next mount.
- **Deep links** — `RootNavigator.handleDeepLink` (`src/app/navigation/RootNavigator.tsx`) handles `tubecast://open?url=...` and `tubecast://listen?url=...&t=...` (parsed by `parseTubeCastOpenUrl` / `parseTubeCastListenUrl` in `src/features/shareLinks/links.ts`). If a track for that source URL already exists (matched by YouTube video id or exact URL via `findTrackForSourceUrl` in `src/features/shareLinks/matching.ts`), it plays immediately; otherwise the navigator routes to `Convert` with `sourceUrl` (and `startAtSeconds` for listen links, which auto-plays once ready). Channel URLs are redirected to `AddChannel` instead.

The same screens are reused from `FeedScreen` and `PublisherPreviewSheet` via the `useSubmitJob` hook, so feed items convert through the identical job flow.

## Remote config gating

`RemoteConfigProvider` (`src/features/remoteConfig/context.tsx`) fetches `/api/mobile-config` (from `EXPO_PUBLIC_MOBILE_CONFIG_URL`, falling back to the server URL) with cache-busting headers, and parses a `features` object into two booleans that both default to `true`:

- `linkProcessingEnabled` — when false, `ConvertScreen` disables the submit button and shows "feature unavailable"; `HomeScreen`, `FeedScreen`, and `AddChannelScreen` hide conversion entrypoints; and deep links to un-cached sources are handed off to the OS via `Linking.openURL` instead of starting a conversion.
- `audioExportEnabled` — when false, `PlayerScreen` and `PlaylistScreen` hide the export/actions UI, leaving only the share-moment action.

## Server job lifecycle

`POST /api/jobs` returns `{ id, status, sourceUrl }`; everything else arrives via polling `GET /api/jobs/:id`, which returns the full `JobResponse` (`src/features/jobs/api.ts`): metadata (title, duration, thumbnail, channel), audio facts (`audioFormat`, `contentType`, `audioFileSize`, `audioExpiresAt`), attempt tracking (`attemptCount`, `errorMessage`, `lastErrorMessage`), and progress fields (`progressPhase`, `progressUpdatedAt`).

Job `status` is one of `queued | processing | ready | failed | expired`. The finer-grained `progressPhase` is `queued | starting | downloading | transcoding | uploading | ready`. `GET /api/jobs/:id/download` returns a presigned URL for the finished audio.

```mermaid
stateDiagram-v2
    [*] --> queued: submitJob POST /api/jobs
    queued --> starting: worker picks up job
    starting --> downloading
    downloading --> transcoding
    transcoding --> uploading
    uploading --> ready
    ready --> expired: audioExpiresAt passes
    queued --> failed: error, attemptCount may increment
    starting --> failed
    downloading --> failed
    transcoding --> failed
    uploading --> failed
    failed --> queued: server-side retry
    ready --> [*]
    failed --> [*]
    expired --> [*]
```

Server-side job lifecycle as seen by the client: `status` (queued/processing/ready/failed/expired) is the source of truth; `progressPhase` refines the `processing` window.

### Polling

`useJobStatus(jobId)` is a React Query with key `["job", jobId]`, refetching every 3 seconds. Polling stops (`refetchInterval` returns `false`) once the status is terminal — `ready`, `failed`, or `expired`. Requests go through the shared axios `apiClient` (`src/shared/apiClient.ts`): 15 s timeout, and response interceptors map HTTP 410 → `AudioExpiredError`, 429 → `RateLimitError` (with parsed `Retry-After`), other non-2xx → `ApiError`, and network/timeout failures → plain `Error`.

### Progress display

`normalizeProgressPhase` (`src/features/jobs/progress.ts`) prefers the server's `progressPhase` when it is a known value, maps any unknown non-empty phase to `starting`, and otherwise derives a phase from `status`. `getHomeProgressInfo` merges job phase with the local cache state into a five-step UI (`PROGRESS_STEPS = queued, download, transcode, save, playable`) plus localized title/detail. When `attemptCount > 0` and `lastErrorMessage` is set, a queued job displays as "retrying" rather than "queued". Cache states (`caching`/`cached`/`error`) override the job phase display and pin the step at "playable".

### Failure and expiry

- **Failed** — `getConversionFailureMessage` (`src/features/jobs/errors.ts`) returns a localized "live unsupported" message when the error text matches live/premiere/upcoming patterns (including Chinese `直播`), otherwise the raw `errorMessage`/`lastErrorMessage`. `ConvertScreen` also shows which phase the job failed at.
- **Expired** — jobs whose server-side audio retention has lapsed report `status: "expired"`; `ConvertScreen` shows an "expired" card. Terminal statuses also clear the `pending_job_id` AsyncStorage key. At playback time, a 410 surfaces as `AudioExpiredError` via the apiClient interceptor.
- **Submission errors** — a failed POST (e.g. `RateLimitError`) shows a generic alert and leaves no pending job.

## From ready job to playable track

When a job becomes `ready`:

1. `useCacheReadyJob` (`src/features/jobs/hooks.ts`) immediately adds a `Track` built by `trackFromReadyJob` (`src/features/jobs/track.ts`) to the playlist, then kicks off caching. `playableTrackFromReadyJob` deduplicates against existing tracks by `jobId`, then by YouTube video id (parsed from `sourceUrl`, preferring `job.sourceId`), so a re-submitted video reuses the existing track instead of duplicating it.
2. `ensureTrackCached` (`src/features/jobs/cache.ts`) downloads the audio via the presigned download URL into `Documents/audio/<jobId>.<ext>.tmp`, verifies the byte size against `job.audioFileSize`, then atomically renames to the final file (extension from `job.audioFormat`, default `m4a`). Concurrency is guarded by an in-flight promise map keyed by job id, and an already-present final file short-circuits to a cached track. On any error the temp file is deleted and the failure propagates.
3. The cached track (with `localPath`, `localFilename`, `downloadedAt`, `cacheStatus: "cached"`) is written back through `addTrack`. If caching fails while the job is ready, the track is saved with `cacheStatus: "failed"` plus `cacheError` — the audio remains playable via streaming, and `retryCache` re-runs the download.

```mermaid
sequenceDiagram
    participant User
    participant Convert as ConvertScreen
    participant Hooks as useCacheReadyJob
    participant Server as API /api/jobs
    participant Cache as ensureTrackCached
    participant FS as Documents/audio
    User->>Convert: paste URL, submit
    Convert->>Server: POST /api/jobs
    loop every 3s until terminal
        Convert->>Server: GET /api/jobs/:id
        Server-->>Convert: status + progressPhase
    end
    Convert->>Hooks: job.status == ready
    Hooks->>Cache: ensureTrackCached(job, addTrack)
    Cache->>Server: GET /api/jobs/:id/download
    Server-->>Cache: presigned URL
    Cache->>FS: download to .tmp, verify size, rename
    FS-->>Cache: final file
    Cache-->>Hooks: Track with cacheStatus cached
    Hooks-->>User: play button on playable track
```

Client-side flow from URL submission through polling to a locally cached, playable track.

## Audio export

`useTrackAudioExport` (`src/features/audioExport/hooks.ts`) exports a track to the OS share sheet. If the track is not yet cached, it re-fetches the job (`getJob`), requires `status: "ready"`, and runs `ensureTrackCached` first — so export works for streaming-only tracks as long as the server still has the audio. `shareTrackAudioFile` (`src/features/audioExport/exportFile.ts`) checks `Sharing.isAvailableAsync` (throwing `AudioExportUnavailableError` otherwise), copies the local file into `Cache/exports/` under a sanitized filename, and shares it as `audio/mp4` with UTI `public.mpeg-4-audio`. Filenames are built by `buildAudioExportFilename` (`src/features/audioExport/filename.ts`): reserved/control characters are replaced with spaces and the `title-channel` basename is truncated to 120 characters, falling back to `TubeCast-<jobId>.m4a`. Failures show a localized alert; a single `exportingTrackId` guard prevents concurrent exports.

## Tests

Focused unit tests cover the pipeline's pure logic: `test/jobs/cache.test.ts` (download, size verification, dedup/in-flight reuse, temp cleanup), `test/jobs/progress.test.ts` (phase normalization, retry display, cache-state overrides), `test/jobs/errors.test.ts` (live-unsupported pattern matching, failure messages), `test/jobs/track.test.ts` (track construction and job/video-id dedup), and `test/audioExport/filename.test.ts` (filename sanitization/truncation).

## Relationships

- Playback and library behavior of the resulting tracks is covered in [Playback & Library](/openwiki/features/playback-library.md).
- Feed-originated conversions (expired feed items falling back to `ConvertScreen`) are covered in [Subscriptions Feed](/openwiki/features/subscriptions-feed.md).
- Overall system layout is covered in [Architecture Overview](/openwiki/architecture/overview.md).
