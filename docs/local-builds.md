# Building Aspen LiDA Locally

This guide covers how to build Aspen LiDA on your own machine instead of using Expo's EAS cloud build servers, via the `scripts/build-local.js` wrapper.

## Prerequisites

- **macOS** (required for iOS builds)
- **Xcode.app** (iOS — full Xcode, not just Command Line Tools; see install steps below)
- **fastlane** and **CocoaPods** (iOS): `brew install fastlane cocoapods`
- **JDK 17**, Android **cmdline-tools**, **platform-tools**, **platforms;android-35**, **build-tools;35.0.0**, **NDK 27.1.12297006** (Android — see install steps below)
- **EAS CLI**: `npm install -g eas-cli`
- Authenticated with Expo: `eas login`
- The usual repo prereqs (`node`, `yarn`) already required by `scripts/update.js`

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

## How it differs from `scripts/update.js`

`scripts/update.js` runs:

```bash
eas build --platform <platform> --profile <channel> --no-wait
```

which queues a build on Expo's servers. `scripts/build-local.js` runs the same pipeline, but with:

```bash
eas build --platform <platform> --profile <channel> --local --non-interactive
```

The `--local` flag executes the build pipeline on this machine. Builds run synchronously (no `--no-wait`) and one instance at a time when you select `all`. The OTA update path is **not** included in `build-local.js` — OTA updates don't involve a native build, so keep using `scripts/update.js` for those.

## Credentials & secrets

### Signing credentials — handled automatically

iOS distribution certs / provisioning profiles and Android keystores are managed by Expo. `eas build --local` downloads them from Expo's credential service at the start of the build and cleans up afterwards. You don't need to copy any keystores or `.p8` files for the build itself.

Inspect or regenerate them with `eas credentials`.

### API keys — pulled from EAS environments

The `API_KEY_1..5` values used by `code/src/util/apiAuth.js` are stored as **secret env vars in EAS environments**. There are three EAS environments — `production`, `preview`, `development` — and the build profiles in `code/eas.json` are linked to them via the `environment` field:

| Build profile | EAS environment |
| ------------- | --------------- |
| production    | production      |
| beta          | preview         |
| alpha         | preview         |
| development   | development     |

Because the profiles declare an `environment`, EAS pulls those env vars into the build context for **both cloud and `--local` builds**. `apiAuth.js` reads them via `import { API_KEY_1 } from '@env'` (react-native-dotenv) at bundle time, with a `process.env.API_KEY_*` fallback when the `@env` import is empty.

For local dev (`scripts/start.js`), the start script runs `eas env:pull` to materialise the keys into `code/.env` so the bundler picks them up. If you're offline or not logged in to EAS, create `code/.env` manually.

To rotate a key, update it in the relevant EAS environment via `eas env:create --environment <env>` (or the dashboard) and rebuild.

List what's currently set:

```bash
cd code
eas env:list --environment production   # or preview / development
```

### `google-services.json`

`code/app.config.js` resolves the google-services file at Expo-config evaluation time via `resolveGoogleServicesFile(slug)`: it prefers `process.env.GOOGLE_SERVICES_JSON` (set by EAS on cloud and `--local` builds when `GOOGLE_SERVICES_JSON` is a file-type env var in the build's environment), falling back to `code/app-configs/<slug>.google-services.json` or `code/app-configs/google-services.json`.

`scripts/build-local.js` pulls the file fresh from EAS into `code/.eas/.env/GOOGLE_SERVICES_JSON` before each local build, so the env-var path is always populated.

### Submit credentials — only if you `eas submit`

`code/eas.json`'s `submit` block references credentials via `$VAR` placeholders (`$ASC_API_KEY_PATH`, `$APPLE_ID`, etc.) that EAS resolves from the build environment. These are only consulted by `eas submit`, not by `eas build --local`. If you only want a local build artifact, ignore them. See `app-config-templates/README.md` for the full list.

## Running a local build

```bash
node scripts/build-local.js
```

You'll be prompted (same as `scripts/update.js`) for channel → instance → platform. The script then runs the build synchronously. EAS prints the artifact path at the end.

| Platform | Profile             | Output          |
| -------- | ------------------- | --------------- |
| Android  | production / beta   | `.aab`          |
| Android  | alpha               | `.apk`          |
| iOS      | production / beta   | `.ipa`          |
| iOS      | alpha / development | Simulator build |

## Troubleshooting

### Missing credentials

Run `eas credentials` to download or regenerate signing material for the platform you're building.

### API keys missing at bundle time

EAS env vars weren't pulled. Check that the build profile in `code/eas.json` has an `environment` field and that the corresponding environment exists with `eas env:list --environment <env>`.

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
