App Store screenshots are generated as five-slide marketing stories for English,
Simplified Chinese, and Traditional Chinese. Each slide has a localized headline,
a single-line supporting message, and a framed proof of the feature. Slide five
uses a Lock Screen playback composition to demonstrate background audio controls.

Example:

```text
zh-Hans/01.png
zh-Hans/02.png
zh-Hans/03.png
en-US/01.png
en-US/02.png
en-US/03.png
zh-Hant/01.png
zh-Hant/02.png
zh-Hant/03.png
```

Generate all 30 assets (five slides × three locales × iPhone/iPad) from the mobile
directory:

```sh
swift scripts/generate-store-screenshots.swift
```

The unframed UI captures live in `screenshot-assets/store-ui`. Keep those files
unchanged so repeated runs do not nest an already-framed screenshot. Traditional
Chinese intentionally uses the English UI captures beneath localized marketing
copy until native `zh-Hant` simulator captures are available.

fastlane infers the App Store screenshot slot from each image's resolution. Upload
the generated assets with `bundle exec fastlane ios screenshots_push`.
