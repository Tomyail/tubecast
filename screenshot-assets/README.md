# Screenshot Assets

These assets are used only by `EXPO_PUBLIC_SCREENSHOT_DEMO_MODE=1` builds for App Store screenshots.

Do not move these files into `assets/demo-covers`. Files under `assets/` can be picked up by Metro and packaged into the IPA. Screenshot demo data references these covers by URL so production builds do not bundle the demo artwork.

If you need to preview unpublished screenshot assets, run a local static file server and set:

```sh
EXPO_PUBLIC_SCREENSHOT_DEMO_ASSET_BASE_URL=http://localhost:<port>/demo-covers
```
