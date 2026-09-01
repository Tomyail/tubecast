# Files

- [Conversion Pipeline](conversion-pipeline.md) - End-to-end YouTube-to-audio flow — URL submission (paste or deep link), server job lifecycle and polling, progress display, local audio caching, track creation, and audio export, with remote-config kill switches.
- [Feature Modules](overview.md) - TubeCast feature modules under /src/features/ — player, playlist, YouTube feed, jobs, discover, demo mode, remote config, share links, settings, and audio export — with responsibilities, key files, and pointers to deeper per-system pages.
- [Playback & Library](playback-library.md) - How the app plays converted audio — player context, state machine, source resolution (cache/remote/demo), progress persistence, background playback, mini player — plus the playlist/track library model, reorder, bulk delete, and unplayed filters.
- [Subscriptions & Feed](subscriptions-feed.md) - Channel subscriptions, feed browsing, publisher preview, discover home content, local AsyncStorage-backed caches and submitted-job tracking, and the iOS share extension entry point that deep-links YouTube URLs into the app.
