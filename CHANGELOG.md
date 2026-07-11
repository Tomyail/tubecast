# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.1.0](https://github.com/Tomyail/tubecast/compare/v1.0.0...v1.1.0) (2026-07-11)


### Features

* **mobile:** add App Store Connect API key auth to TestFlight flow ([663cb56](https://github.com/Tomyail/tubecast/commit/663cb5604a2849cbdf16e59156a08aab75709e3b))
* **mobile:** refresh discover/home UI with hero cards and softer palette ([0cdff0d](https://github.com/Tomyail/tubecast/commit/0cdff0da9fd04816d82bd2ef934535ca3d82c092))
* **mobile:** split TestFlight flow into separate build/upload/distribute steps ([2c40bf5](https://github.com/Tomyail/tubecast/commit/2c40bf5dd6e0792365a44286c40a658a64a2a484))

## 1.0.0 (2026-06-27)

### Features

* feat(mobile): add unplayed filter to playlist screen
* feat(mobile): show channel name on lock screen instead of hardcoded TubeCast
* feat(mobile): improve player seek with drag-to-scrub and optimistic preview
* feat(mobile): add MarqueeText component for MiniPlayer long titles
* feat(mobile): show build version and commit in Settings About
* feat(mobile): add light/dark/system theme switcher in Settings
* feat(mobile): adopt expo-image with fade-in, introduce design tokens
* feat(mobile): unify empty states, per-card tap feedback, global press feedback
* feat(mobile): add Touchable press feedback, enrich MiniPlayer, prune dead styles
* feat(mobile): surface live-unsupported job failures to the user
* feat(mobile): poll publisher preview conversions and reflect status live
* feat(mobile): add publisher preview sheet with subscribe
* feat(mobile): thread channel info into Track and player
* feat(mobile): add discover feed home + ConvertScreen
* feat(mobile): add adaptive theme
* feat(i18n): add English/Chinese localization with system language detection
* feat(mobile): show loading state while audio metadata parses
* feat(mobile): play ready jobs while caching audio
* feat(progress): add real conversion phase progress across mobile/api/worker
* feat(playlist): batch delete with edit mode, checkboxes, and floating action bar
* feat(player): expose stopPlayback method
* feat(playlist): add deleteTracks bulk operation to context
* feat(playlist): add bulk track removal to storage
* feat(mobile): read SERVER_URL from EXPO_PUBLIC_SERVER_URL env var
* feat: move youtube feed access to backend
* feat: make project public — IP rate limiting, remove auth token
* feat: drag-to-reorder playlist with DraggableFlatList
* feat: show orange dot for unplayed tracks, dim title after completion
* feat: tap title in PlayerScreen opens YouTube at current timestamp
* feat: swipe-to-delete in playlist with confirmation and local file cleanup
* feat: add YouTube API key setup hint with links in Settings screen
* feat: tighten mobile player experience
* feat: improve mobile submit and library flow

### Bug Fixes

* fix(mobile): write full TestFlight release changelogs
* fix(mobile): stabilize player toggle, resume, and auto-advance
* fix(mobile): reserve fixed height for feed card status row to stop jump on convert
* fix(mobile): let list screens manage their own MiniPlayer bottom padding
* fix(mobile): auto-refresh storage on entering Settings, unify About icons
* fix(mobile): hide misleading "Tabs" back-title on Player screen
* fix(mobile): playlist replay starts from beginning and toggles current track
* fix(mobile): CHANGELOG section regex handles first-release header
* fix(mobile): bump app.json expo.version via custom updater
* fix(ios): set deploymentTarget 16.4 for Expo SDK 56
* fix(layout): dynamic bottom padding based on MiniPlayer visibility
* fix(feed): prevent duplicate playlist entries on convert
* fix(playlist): snapshot selectedIds before Alert to avoid stale closure
* fix(playlist): align removeTracksFromPlaylist error handling with single-item variant
* fix(mobile): migrate legacy channel storage format and filter invalid platformSourceId
* fix: patch expo-modules-core to fix reanimated build error
* fix: pause playback when tapping title to open YouTube
* fix: match track item background to screen color #f4ede2
* fix: Feed Convert now downloads audio and Play properly loads the player
* fix: poll job status in FeedScreen after Convert so UI updates reactively
* fix: show Add Channel button on empty subscriptions state
* fix: prevent duplicate tracks in playlist state when same job is added twice
* fix: make downloadAndSaveTrack idempotent to handle app-restart re-trigger
* fix: resolve issues #9 #10 #12 - permanent error routing, job dedup, and mobile job persistence

### Performance

* perf(mobile): isolate player progress re-render, optimize feed list

### Refactoring

* refactor(mobile): remove dead UI and download code
* refactor(mobile): remove dead library and legacy api code
* refactor: add mobile app foundation

### Documentation

* docs(mobile): expand README feature list, remove backend section
* docs(mobile): update README and screenshots
* docs(mobile): add TestFlight beta link to README

### Other

* chore: upgrade react-native-reanimated to v4.3.1
* Feat/youtube subscription feed (#13)
* Add per-viewer library with viewer-scoped job access control
* Add public admin controls and anonymous service limits
* Simplify player state transitions
* Refine player switching behavior
* Auto-play newly ready audio when idle
* Add Gemini video summary button
* Fix iOS build linker errors: Core
* Fix playback progress persistence
* Auto-play next ready audio
* Add autoplay after processing job
* Add progress bar seek support
* Save playback progress data
* Add buffering progress bar
* Add eas ios preview build docs
* Add Open on YouTube button
* Add left-swipe delete to iOS queue
* Update docs for audioHref links
* Migrate repo to pnpm workspace
* Implement mobile auth dedupe push
