# Building Aspen LiDA Locally

This guide covers how to build Aspen LiDA on your own machine instead of using Expo's EAS cloud build servers, via the `scripts/updater_local.sh` wrapper.

> `scripts/` is gitignored. Copy the template the first time you set up: `cp script-templates/updater_local.sh scripts/updater_local.sh && chmod +x scripts/updater_local.sh`. Same convention as `updater.sh`.

## Prerequisites

- **macOS** (required for iOS builds)
- **Xcode.app** (iOS — full Xcode, not just Command Line Tools; see install steps below)
- **fastlane** and **CocoaPods** (iOS): `brew install fastlane cocoapods`
- **JDK 17**, Android **cmdline-tools**, **platform-tools**, **platforms;android-35**, **build-tools;35.0.0**, **NDK 27.1.12297006** (Android — see install steps below)
- **EAS CLI**: `npm install -g eas-cli`
- Authenticated with Expo: `eas login`
- The usual repo prereqs (`jq`, `node`, `yarn`) already required by `updater.sh`

### iOS toolchain install (one-off)

iOS builds need the full `Xcode.app`, not just the Command Line Tools. CocoaPods shells out to `xcodebuild` and fails with `Unexpected XCode version string ''` if only CLT is installed. Xcode is ~15 GB and is not redistributable via Homebrew, but the `xcodes` CLI automates the developer.apple.com `.xip` download/install:

```bash
brew install xcodes aria2
xcodes install 16.4 --select        # latest Xcode that runs on macOS 15 (Sequoia)
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
xcodebuild -downloadPlatform iOS    # ~9 GB; installs the iOS device SDK/runtime
```

`xcodes install` is interactive — it will prompt for your Apple ID (and 2FA). `--select` runs `xcode-select -s` on the new install automatically. If you're on macOS 26 (Tahoe) you can pick a newer Xcode from `xcodes list`.

Installing Xcode also lands the Apple WWDR intermediate certificate in your login keychain, which the EAS iOS credentials phase needs to validate the distribution cert it imports into its temp keychain. Without Xcode installed, that phase fails with `Distribution certificate with fingerprint ... hasn't been imported successfully`.

### Android toolchain install (one-off)

Versions are pinned to what Expo SDK 53 expects. JDK 17 is installed as the keg-only `openjdk@17` formula so it doesn't need sudo.

```bash
brew install openjdk@17
brew install --cask android-commandlinetools

export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$PATH:$ANDROID_HOME/platform-tools

yes | sdkmanager --licenses
sdkmanager --install \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "ndk;27.1.12297006"
```

Add the four `export` lines to `~/.zshrc` so they persist. Verify with `java -version` (should print `17.x`) and `ls $ANDROID_HOME/{platforms,build-tools,ndk}`.

> Note: there's also a stale `~/Library/Android/sdk` from a prior Android Studio install. It only contains an older NDK and isn't on the path — leave it or `rm -rf` it; the new SDK lives entirely under `/opt/homebrew/share/android-commandlinetools`.

## How it differs from `updater.sh`

`updater.sh` runs:

```bash
eas build --platform <platform> --profile <channel> --no-wait
```

which queues a build on Expo's servers. `updater_local.sh` runs the same pipeline, but with:

```bash
eas build --platform <platform> --profile <channel> --local --non-interactive
```

The `--local` flag executes the build pipeline on this machine. Builds run synchronously (no `--no-wait`) and one instance at a time when you select `all`. The OTA update path is **not** included in `updater_local.sh` — OTA updates don't involve a native build, so keep using `updater.sh` for those.

Everything else (`copyConfig.js`, `updateConfig.js`, the `sed` substitution into `eas.json`) is unchanged.

## Credentials & secrets

### Signing credentials — handled automatically

iOS distribution certs / provisioning profiles and Android keystores are managed by Expo. `eas build --local` downloads them from Expo's credential service at the start of the build and cleans up afterwards. You don't need to copy any keystores or `.p8` files for the build itself.

Inspect or regenerate them with `eas credentials`.

### API keys — pulled from EAS environments

The `API_KEY_1..5` values used by `code/src/util/apiAuth.js` are stored as **secret env vars in EAS environments**, not in the local `app-configs/.env` file. There are three EAS environments — `production`, `preview`, `development` — and the build profiles in `app-config-templates/eas.json` are linked to them via the `environment` field:

| Build profile | EAS environment |
| ------------- | --------------- |
| production    | production      |
| beta          | preview         |
| alpha         | preview         |
| development   | development     |

Because the profiles declare an `environment`, EAS pulls those env vars into the build context for **both cloud and `--local` builds**.

`code/preinstall.js` runs as the `eas-build-pre-install` lifecycle hook and writes the `API_KEY_*` values from `process.env` into `code/.env` so that `react-native-dotenv` (used by `import { API_KEY_1 } from '@env'`) can pick them up at bundle time. If any key is missing from the environment it falls back to whatever `.env` was shipped with the project.

`app-configs/.env` is no longer the source of truth for API keys — the file is left in place but unused. To rotate a key, update it in the relevant EAS environment via `eas env:create --environment <env>` (or the dashboard) and rebuild.

List what's currently set:

```bash
cd code
eas env:list --environment production   # or preview / development
```

### `google-services.json`

`app-configs/google-services.json` is checked into the repo and `scripts/updateConfig.js` writes the path `'../app-configs/google-services.json'` into `code/app.config.js`.

`preinstall.js` rewrites that path to `process.env.GOOGLE_SERVICES_JSON` **only if** the env var is set — i.e. on cloud builds where EAS materializes the file secret. On local builds the env var is unset, so the local path is left in place and used as-is. No manual file placement needed.

### Submit credentials — only if you `eas submit`

`apps.json` has per-instance `googleServiceKeyPath` and `ascApiKey*` fields that `updateConfig.js` substitutes into the `submit` block of `eas.json`. These are only consulted by `eas submit`, not by `eas build --local`. If you only want a local build artifact, ignore them.

## Running a local build

```bash
cd scripts
./updater_local.sh
```

You'll be prompted (same as `updater.sh`) for channel → instance → platform. The script then runs the build synchronously. EAS prints the artifact path at the end.

| Platform | Profile             | Output          |
| -------- | ------------------- | --------------- |
| Android  | production / beta   | `.aab`          |
| Android  | alpha               | `.apk`          |
| iOS      | production / beta   | `.ipa`          |
| iOS      | alpha / development | Simulator build |

## Troubleshooting

### Missing credentials

Run `eas credentials` to download or regenerate signing material for the platform you're building.

### `Missing API key env vars: ...` in preinstall

EAS env vars weren't pulled. Check that the build profile in `app-config-templates/eas.json` has an `environment` field and that the corresponding environment exists with `eas env:list --environment <env>`.

### `iOS X.Y is not installed` / `Unable to find a destination matching ... generic:1, platform:iOS`

Xcode 16+ downloads the iOS platform SDK on demand. Run `xcodebuild -downloadPlatform iOS` (~9 GB) and retry.

### `Unexpected XCode version string ''` during pod install

`xcode-select` is pointing at Command Line Tools, not a full Xcode.app. Install Xcode (see iOS toolchain section) and run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` (adjust path for your Xcode version).

### iOS signing errors

Make sure your Apple Developer account is signed in under **Xcode → Settings → Accounts** and that the team matches `appleTeamId` in `apps.json` for the instance. `eas credentials` can rebuild profiles if they've expired.

### Android keystore errors

`eas credentials` → Android → download/regenerate keystore.

### Android build can't find SDK / NDK

Make sure the four `export` lines from the install section are in your `~/.zshrc` and your shell has been restarted.
