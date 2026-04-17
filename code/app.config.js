const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, 'app-configs');

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveInstance() {
  const instance = process.env.APP_ENV;
  if (!instance) {
    throw new Error(
      'APP_ENV is not set. Set it to an instance key from app-configs/apps.json ' +
      '(e.g. APP_ENV=LiDA-Europe npx expo start)'
    );
  }

  const apps = loadJSON(path.join(CONFIG_DIR, 'apps.json'));
  if (!apps[instance]) {
    const available = Object.keys(apps).join(', ');
    throw new Error(
      `APP_ENV="${instance}" not found in apps.json. Available instances: ${available}`
    );
  }

  return { instance, app: apps[instance] };
}

function resolveOwner(slug) {
  const perInstance = path.join(CONFIG_DIR, `${slug}.projectOwner.json`);
  const fallback = path.join(CONFIG_DIR, 'projectOwner.json');
  return loadJSON(fs.existsSync(perInstance) ? perInstance : fallback);
}

function resolveGoogleServicesFile(slug) {
  if (process.env.GOOGLE_SERVICES_JSON) {
    return process.env.GOOGLE_SERVICES_JSON;
  }
  const perInstance = path.join(CONFIG_DIR, `${slug}.google-services.json`);
  const fallback = path.join(CONFIG_DIR, 'google-services.json');
  return fs.existsSync(perInstance) ? perInstance : fallback;
}

function logoUrl(discoveryUrl, themeId, slug, type) {
  return `${discoveryUrl}API/SystemAPI?method=getLogoFile&themeId=${themeId}&type=${type}&slug=${slug}`;
}

function buildConfig(app, owner, build, version) {
  const buildNumber = String(build.build);
  const versionCode = parseInt(build.build, 10);

  return {
    name: app.name,
    slug: app.slug,
    scheme: app.scheme,
    owner: owner.expoProjectOwner,
    platforms: ['ios', 'android'],
    version: version.version,
    sdkVersion: '53.0.0',
    newArchEnabled: false,
    userInterfaceStyle: 'automatic',
    orientation: 'default',
    icon: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appIcon'),
    updates: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 250000,
      url: `https://u.expo.dev/${app.easId}`,
    },
    runtimeVersion: buildNumber,
    splash: {
      image: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appSplash'),
      resizeMode: 'contain',
      backgroundColor: app.background,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      buildNumber,
      bundleIdentifier: app.reverseDns,
      supportsTablet: true,
      icon: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appIcon'),
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'This app uses your location to find nearby libraries to make logging in easier',
        NSLocationWhenInUseUsageDescription:
          'This app uses your location to find nearby libraries to make logging in easier',
        LSApplicationQueriesSchemes: [
          'comgooglemaps', 'citymapper', 'uber', 'lyft', 'waze',
          'aspen-lida', 'aspen-lida-beta', 'itms-apps',
        ],
        CFBundleAllowMixedLocalizations: true,
        NSCameraUsageDescription:
          'This app uses your camera to scan barcodes when searching for items in the library catalog',
        NSMicrophoneUsageDescription:
          'This app uses your microphone when scanning barcodes when searching for items in the library catalog',
        NSCalendarsUsageDescription: 'This app can add library events to your calendar',
        NSRemindersUsageDescription: 'This app can add library events to your reminders',
      },
      config: {
        googleMapsApiKey: owner.googleApiKeyApple,
        usesNonExemptEncryption: false,
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['8FFB.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['DDA9.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
    },
    android: {
      allowBackup: false,
      package: app.reverseDns,
      versionCode,
      permissions: [
        'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION',
        'RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM',
        'CAMERA', 'READ_CALENDAR', 'WRITE_CALENDAR',
      ],
      adaptiveIcon: {
        foregroundImage: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appIconAndroid'),
        backgroundColor: app.background,
      },
      icon: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appIconAndroid'),
      googleServicesFile: resolveGoogleServicesFile(app.slug),
      config: {
        googleMaps: {
          apiKey: owner.googleApiKeyAndroid,
        },
      },
      edgeToEdgeEnabled: true,
    },
    notification: {
      icon: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appNotification'),
    },
    extra: {
      apiUrl: app.discoveryUrl,
      greenhouseUrl: owner.greenhouseUrl,
      loginLogo: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'appLogin'),
      libraryCardLogo: logoUrl(app.discoveryUrl, app.themeId, app.slug, 'logoApp'),
      backgroundColor: app.background,
      libraryId: app.libraryId,
      themeId: app.themeId,
      sentryDSN: app.sentryDsn,
      eas: {
        projectId: app.easId,
      },
      iosStoreUrl: `itms-apps://apps.apple.com/id/app/${app.slug}/id${app.ascAppId}`,
      androidStoreUrl: `market://details?id=${app.reverseDns}`,
      patch: version.patch,
      stage: version.stage,
      logLevel: app.logLevel,
    },
    plugins: [
      'expo-secure-store',
      'expo-localization',
      'expo-notifications',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'This app uses your location to find nearby libraries to make logging in easier',
        },
      ],
      [
        'expo-calendar',
        { calendarPermission: 'This app can add library events to your calendar' },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'This app uses your camera to scan barcodes when searching for items in the library catalog or when scanning your library card.',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          authToken: app.sentryAuth,
          organization: owner.expoProjectOwner,
          project: app.sentryProject,
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
          },
          ios: {
            deploymentTarget: '15.1',
          },
        },
      ],
      ['expo-web-browser'],
    ],
  };
}

module.exports = () => {
  const { app } = resolveInstance();
  const owner = resolveOwner(app.slug);
  const build = loadJSON(path.join(CONFIG_DIR, 'build.json'));
  const version = loadJSON(path.join(__dirname, '..', 'version.json'));
  return buildConfig(app, owner, build, version);
};
