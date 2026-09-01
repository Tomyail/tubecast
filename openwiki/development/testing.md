---
type: "Reference"
title: "Testing Guide"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-01T21:28:30.610Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-73954745e2fc02da201fb291
    resource: repo://test/i18n/formatters.test.ts
  - id: openwiki-source-c41be34229ed71a6500d977b
    resource: repo://test/jobs/track.test.ts
  - id: openwiki-source-3e0fc0a51e74f1b15325770b
    resource: repo://test/setup.test.ts
  - id: openwiki-source-e8f6a89d2cc3389051ca4410
    resource: repo://test/youtubeFeed/cache.test.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-01T21:28:30.610Z" }
---


# Testing Guide

The mobile app's unit test suite runs on [Vitest](https://vitest.dev) with no custom plugins or setup files — the whole configuration is a single `include` pattern. Tests are plain Node-side TypeScript files under `test/` that import directly from `src/`; React Native modules (storage, networking) are stubbed with `vi.mock`, so the suite never boots the Expo runtime.

## Configuration and entry points

`vitest.config.ts` picks up exactly the files matching `test/**/*.test.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
```

The `test` script in `package.json` (`vitest run`) executes the whole suite once in CI style. There is no watch-mode script, but `npx vitest` from the repo root gives you watch mode, and any Vitest CLI filtering (file paths, `-t "name"`) works because of the single shared config.

`test/setup.test.ts` is a canary, not a setup file: it just asserts `1 + 1 === 2` to prove the harness itself is wired up. If everything else fails but this passes, the problem is in the tests, not the toolchain.

## Directory layout

`test/` mirrors the source layout. Feature tests live in `test/<feature>/` corresponding to `src/features/<feature>/`; cross-cutting areas get their own directories:

| Test directory | Covers | Related feature/system page |
| --- | --- | --- |
| `test/youtubeFeed/` | Feed API client, feed cache, feed aggregation, URL input parsing, feed/source storage, submitted-jobs storage | YouTube feed system |
| `test/jobs/` | Conversion job API cache, error classification, progress reporting, job→track mapping | Conversion pipeline |
| `test/player/` | Player state machine, audio source resolution, progress-drag behavior | Playback library |
| `test/playlist/` | Playlist filtering and track persistence | Playback library |
| `test/audioExport/` | Export filename generation | Audio export |
| `test/discover/` | Discover API client and cache | Discover |
| `test/shareLinks/` | Share link generation and URL matching | Share links |
| `test/settings/` | Settings storage | Settings |
| `test/remoteConfig/` | Remote configuration parsing | Remote config |
| `test/app/` | Theme preference logic | App shell |
| `test/screens/` | Screen-level layout helpers (`manageChannelsLayout`) | Screens |
| `test/components/` | Component layout math (`marqueeLayout`) | UI components |
| `test/i18n/` | Localized duration/file-size formatters, app-review copy | Internationalization |

## Choosing the narrowest test

Run the single file that covers the module you touched, then widen only if needed:

```bash
# One file (fastest feedback loop)
npx vitest run test/player/state.test.ts

# One feature area (all tests in a directory)
npx vitest run test/youtubeFeed/
npx vitest run test/jobs/
npx vitest run test/player/
npx vitest run test/playlist/
npx vitest run test/i18n/

# One test case by name across the suite
npx vitest run -t "formats duration"

# Full suite — the same thing `pnpm test` runs
pnpm test
```

Rules of thumb:

- **Pure logic** (formatters, filename generation, URL matching, layout math): the corresponding single test file is sufficient.
- **Storage-backed modules** (feed cache, playlist storage, settings): tests mock `@react-native-async-storage/async-storage` with an in-memory record; run the whole feature directory when changing storage keys or schemas, because several files in one area may share the same mocked store semantics.
- **Cross-feature changes**: when you touch a boundary such as `src/features/jobs/track.ts` (jobs → playlist tracks), run both adjacent areas: `npx vitest run test/jobs/ test/playlist/`.
- **Config or dependency changes**: run the full `pnpm test`, plus `test/setup.test.ts` first to confirm the harness still loads.

## Conventions

- Tests use only Vitest built-ins (`describe`, `it`, `expect`, `vi`); there is no React Testing Library or native-module emulator, so component rendering is not covered — only the extractable logic (state machines, caches, parsers, formatters).
- Prefer adding logic to pure modules under `src/features/**` so it stays testable this way; see [Conventions](/openwiki/development/conventions.md).
- Mock native modules at the module boundary with `vi.mock("<package>", ...)` and dynamic `await import(...)` of the module under test, matching the existing pattern in `test/youtubeFeed/cache.test.ts`.
