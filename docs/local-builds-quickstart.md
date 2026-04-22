# Local Builds — Quickstart

Minimal steps to get `scripts/build-local.js` producing a build on a fresh macOS machine. See [`local-builds.md`](./local-builds.md) for the full explanation.

## 1. Install toolchains

**iOS** (skip if Android-only):

```bash
brew install fastlane cocoapods xcodes aria2
xcodes install 16.4 --select
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
xcodebuild -downloadPlatform iOS
```

**Android** (skip if iOS-only):

```bash
brew install openjdk@17
brew install --cask android-commandlinetools

cat >> ~/.zshrc <<'EOF'
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$PATH:$ANDROID_HOME/platform-tools
EOF
source ~/.zshrc

yes | sdkmanager --licenses
sdkmanager --install "platform-tools" "platforms;android-35" "build-tools;35.0.0" "ndk;27.1.12297006"
```

## 2. EAS CLI + login

```bash
npm install -g eas-cli
eas login
```

## 3. Run it

```bash
node scripts/build-local.js
```

Pick channel → instance → platform. Build runs synchronously; artifact path is printed at the end.

## Common first-run errors

| Error | Fix |
| --- | --- |
| `Unexpected XCode version string ''` | `sudo xcode-select -s /Applications/Xcode-16.4.0.app/Contents/Developer` |
| `iOS 18.x is not installed` | `xcodebuild -downloadPlatform iOS` |
| `Missing API key env vars` in preinstall | Check that the build profile has an `environment` field in `app-config-templates/eas.json` and that `eas env:list --environment <env>` shows the keys |
| Android SDK / NDK not found | Make sure the four `export` lines from step 1 are in `~/.zshrc` and the shell was restarted |
