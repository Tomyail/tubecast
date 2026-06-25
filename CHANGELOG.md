# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 1.1.0 (2026-06-25)


### Features

* add YouTube API key setup hint with links in Settings screen ([fd4131a](https://github.com/Tomyail/tubecast/commit/fd4131a2a812f1dda84bb382c72a86726c8e7eb9))
* drag-to-reorder playlist with DraggableFlatList ([7f363eb](https://github.com/Tomyail/tubecast/commit/7f363eb2f8c8710f509e3cbe79fdf4651a585d99))
* **i18n:** add English/Chinese localization with system language detection ([bbe347f](https://github.com/Tomyail/tubecast/commit/bbe347f8f184c4be98f20b6d088266767115f879))
* improve mobile submit and library flow ([7622a03](https://github.com/Tomyail/tubecast/commit/7622a037141c76403d190aefff0e105950804a7f))
* make project public — IP rate limiting, remove auth token ([c451101](https://github.com/Tomyail/tubecast/commit/c45110104002e62acfa1d4e2e7a27920bf836f9c))
* **mobile:** add adaptive theme ([d08cbee](https://github.com/Tomyail/tubecast/commit/d08cbeef640ff05a805d251dbe7abe40473f2eb6))
* **mobile:** add discover feed home + ConvertScreen ([2f5a801](https://github.com/Tomyail/tubecast/commit/2f5a801b67f6ca79adabfec041f7b219900299b9))
* **mobile:** add publisher preview sheet with subscribe ([a758dd5](https://github.com/Tomyail/tubecast/commit/a758dd5bee1192734f0ebf17d3b799162b061ca2))
* **mobile:** play ready jobs while caching audio ([681c111](https://github.com/Tomyail/tubecast/commit/681c111838293362d5c049ff74aded36702827f3))
* **mobile:** read SERVER_URL from EXPO_PUBLIC_SERVER_URL env var ([83c4c99](https://github.com/Tomyail/tubecast/commit/83c4c9937d403efa9debcaa14cccd9d2e75558b5))
* **mobile:** show loading state while audio metadata parses ([fc361ab](https://github.com/Tomyail/tubecast/commit/fc361abf1d34355cc2033765ec626e48b6ca12d9))
* **mobile:** thread channel info into Track and player ([0a68835](https://github.com/Tomyail/tubecast/commit/0a68835c257744e2ce7bd0732e0c983d6c1fac60))
* move youtube feed access to backend ([a0b072a](https://github.com/Tomyail/tubecast/commit/a0b072a59d0df93a06c8d68f137c89acc907893a))
* **player:** expose stopPlayback method ([0cd8b87](https://github.com/Tomyail/tubecast/commit/0cd8b8799941099d197a319d32a44a9d61391231))
* **playlist:** add bulk track removal to storage ([6dd7ed3](https://github.com/Tomyail/tubecast/commit/6dd7ed3d9ba776d9593b91d076d439a28f9caa40))
* **playlist:** add deleteTracks bulk operation to context ([878dac8](https://github.com/Tomyail/tubecast/commit/878dac87ac4ced0f93dd2cbe63a565d51406579a))
* **playlist:** batch delete with edit mode, checkboxes, and floating action bar ([a4c9847](https://github.com/Tomyail/tubecast/commit/a4c984768b016446dd1153c0d0558d32c6bfcf14))
* **progress:** add real conversion phase progress across mobile/api/worker ([d45bd0c](https://github.com/Tomyail/tubecast/commit/d45bd0c5be3b9177affa5a3d86740fded56b3682))
* show orange dot for unplayed tracks, dim title after completion ([1db02d3](https://github.com/Tomyail/tubecast/commit/1db02d35805035431efd2f83eacefacf7987d5a8))
* swipe-to-delete in playlist with confirmation and local file cleanup ([959bd01](https://github.com/Tomyail/tubecast/commit/959bd011efb7bf96cd76bb0ca78b4cc5c46fe417))
* tap title in PlayerScreen opens YouTube at current timestamp ([718325c](https://github.com/Tomyail/tubecast/commit/718325cc4b38f994eee4cce5de79393a8db42a99))
* tighten mobile player experience ([9a71978](https://github.com/Tomyail/tubecast/commit/9a719786d9675afbb1ba421f0dfb180660461364))


### Bug Fixes

* Feed Convert now downloads audio and Play properly loads the player ([2a95f22](https://github.com/Tomyail/tubecast/commit/2a95f22fd3fa71f81ec12fce3464cf71473ae762))
* **feed:** prevent duplicate playlist entries on convert ([6ee1e22](https://github.com/Tomyail/tubecast/commit/6ee1e225ae2d843c9d19b6f142cc3e6e2fe7ca05))
* **ios:** set deploymentTarget 16.4 for Expo SDK 56 ([9d1ab06](https://github.com/Tomyail/tubecast/commit/9d1ab060c81d5523e5553cbb582acbd984253d48))
* **layout:** dynamic bottom padding based on MiniPlayer visibility ([fc8f9e0](https://github.com/Tomyail/tubecast/commit/fc8f9e0f2926b64cb01c17ca616fd67d146849a7))
* make downloadAndSaveTrack idempotent to handle app-restart re-trigger ([f8677ea](https://github.com/Tomyail/tubecast/commit/f8677ea3d96754261e86aa286e6db9e01ef5a77a)), closes [#10](https://github.com/Tomyail/tubecast/issues/10)
* match track item background to screen color #f4ede2 ([b2c1023](https://github.com/Tomyail/tubecast/commit/b2c1023bf5c5daecd1ed815ec77392fafba9927a)), closes [#f4ede2](https://github.com/Tomyail/tubecast/issues/f4ede2)
* **mobile:** bump app.json expo.version via custom updater ([65e5cd4](https://github.com/Tomyail/tubecast/commit/65e5cd4c66bf2cc8ce1b1cece8c9a5b8db8fdf19))
* **mobile:** migrate legacy channel storage format and filter invalid platformSourceId ([f916e0b](https://github.com/Tomyail/tubecast/commit/f916e0b2a145202f1e2792834b4913f70c04a4f0))
* patch expo-modules-core to fix reanimated build error ([c1b4bce](https://github.com/Tomyail/tubecast/commit/c1b4bcea62946c7455a6c1385c77e87368f34e1a))
* pause playback when tapping title to open YouTube ([3c77aba](https://github.com/Tomyail/tubecast/commit/3c77aba1c63f0d274274c2e3f6f062544c9c25ee))
* **playlist:** align removeTracksFromPlaylist error handling with single-item variant ([bfe82ba](https://github.com/Tomyail/tubecast/commit/bfe82baa19571d217e8cdeb119899b5a6b3cd0b0))
* **playlist:** snapshot selectedIds before Alert to avoid stale closure ([9e779d1](https://github.com/Tomyail/tubecast/commit/9e779d1c7ef1e2d83bd4643f40d6dc2df6945f89))
* poll job status in FeedScreen after Convert so UI updates reactively ([f43410f](https://github.com/Tomyail/tubecast/commit/f43410fd3048b479024b3828faffd400191c9a11))
* prevent duplicate tracks in playlist state when same job is added twice ([2131814](https://github.com/Tomyail/tubecast/commit/2131814f6ad459cc888b9a9513444c8283d0dfef))
* resolve issues [#9](https://github.com/Tomyail/tubecast/issues/9) [#10](https://github.com/Tomyail/tubecast/issues/10) [#12](https://github.com/Tomyail/tubecast/issues/12) - permanent error routing, job dedup, and mobile job persistence ([dbb2b3f](https://github.com/Tomyail/tubecast/commit/dbb2b3faf4c711778f62c669808c8b9f20c0f4f2))
* show Add Channel button on empty subscriptions state ([56e9fac](https://github.com/Tomyail/tubecast/commit/56e9facfa323aeaf58a4b56a4d38180eaaa394d8))
