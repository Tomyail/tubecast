fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios testflight_build

```sh
[bundle exec] fastlane ios testflight_build
```

Build an App Store IPA for TestFlight. Does not upload.

### ios testflight_upload

```sh
[bundle exec] fastlane ios testflight_upload
```

Upload an existing IPA to TestFlight without distributing it to testers.

### ios testflight_distribute

```sh
[bundle exec] fastlane ios testflight_distribute
```

Distribute an already-uploaded TestFlight build to tester groups.

### ios metadata_push

```sh
[bundle exec] fastlane ios metadata_push
```

Upload localized App Store metadata only. Does not upload a binary or screenshots.

### ios screenshots_push

```sh
[bundle exec] fastlane ios screenshots_push
```

Upload localized App Store screenshots only. Does not upload a binary.

### ios store_assets_push

```sh
[bundle exec] fastlane ios store_assets_push
```

Upload localized metadata and screenshots. Does not upload a binary.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
