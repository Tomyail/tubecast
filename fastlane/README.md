# fastlane App Store automation

This fastlane setup manages App Store Connect metadata, screenshots, and the
split TestFlight build/upload/distribution flow. The existing local Xcode
Archive and Transporter flow can still be used as a fallback.

## First-time setup

```bash
cd mobile
mise install
mise exec -- bundle install
```

Use either Apple ID auth:

```bash
export FASTLANE_USER="you@example.com"
```

Or App Store Connect API key auth, which is better for repeatable automation.
Follow fastlane's App Store Connect API key docs, then keep credentials outside
git.

## Pull current App Store Connect metadata

Run this once after manual edits in App Store Connect, then commit the local
metadata files you want to keep:

```bash
mise exec -- bundle exec fastlane deliver download_metadata \
  --app_identifier com.tomyail.tubecast \
  --metadata_path ./fastlane/metadata
```

Screenshots can be pulled separately:

```bash
mise exec -- bundle exec fastlane deliver download_screenshots \
  --app_identifier com.tomyail.tubecast \
  --screenshots_path ./fastlane/screenshots
```

## Push changes

Metadata only:

```bash
mise exec -- bundle exec fastlane metadata_push
```

Screenshots only:

```bash
mise exec -- bundle exec fastlane screenshots_push
```

Metadata and screenshots:

```bash
mise exec -- bundle exec fastlane store_assets_push
```

These lanes use `skip_binary_upload: true` and `skip_app_version_update: true`,
so they are safe to run without a new build.

## TestFlight flow

Build numbers are bumped separately so failed builds or upload retries do not
burn additional build numbers.

```bash
pnpm release:testflight-bump
pnpm release:testflight-prepare
pnpm release:testflight-build
pnpm release:testflight-upload
pnpm release:testflight-changelog
pnpm release:testflight-tag
```

The build lane writes the IPA to:

```text
build/ios/TubeCast.ipa
```

Override the IPA path for upload if needed:

```bash
IPA_PATH=/path/to/TubeCast.ipa pnpm release:testflight-upload
```

`release:testflight-upload` only uploads the IPA. It uses
`skip_submission: true`, so it does not distribute the build to tester groups.

To distribute an already-uploaded build, provide a tester-facing changelog:

```bash
TESTFLIGHT_CHANGELOG="Test discovery, playlist playback, sharing, and settings." \
  pnpm release:testflight-distribute
```

Distribution defaults:

```text
TESTFLIGHT_GROUPS=Public Beta Testers
TESTFLIGHT_EXTERNAL=1
TESTFLIGHT_NOTIFY=0
```

Set `TESTFLIGHT_NOTIFY=1` only when you want TestFlight to notify external
testers.

## Screenshot layout

fastlane expects screenshots under locale-specific folders:

```text
fastlane/screenshots/zh-Hans/
fastlane/screenshots/en-US/
fastlane/screenshots/zh-Hant/
```

Use numbered filenames such as `01.png`, `02.png`, `03.png`. fastlane detects
the device slot from image resolution.
