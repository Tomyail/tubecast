# fastlane App Store metadata

This fastlane setup manages App Store Connect metadata and screenshots only. It
does not build, upload, or submit the iOS binary. Keep using the existing local
Xcode Archive and Transporter flow for builds.

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

## Screenshot layout

fastlane expects screenshots under locale-specific folders:

```text
fastlane/screenshots/zh-Hans/
fastlane/screenshots/en-US/
fastlane/screenshots/zh-Hant/
```

Use numbered filenames such as `01.png`, `02.png`, `03.png`. fastlane detects
the device slot from image resolution.
