# App Config Templates

These are blank templates for the configuration files needed in `code/app-configs/`.

## Setup

Copy each template into `code/app-configs/` and fill in the values for your
deployment:

```
mkdir -p code/app-configs
cp app-config-templates/apps.json         code/app-configs/apps.json
cp app-config-templates/build.json        code/app-configs/build.json
cp app-config-templates/projectOwner.json code/app-configs/projectOwner.json
cp version.json                           code/app-configs/version.json
```

You will also need a `google-services.json` from the Firebase console for your
Android app, placed in `code/app-configs/`.

The `code/app-configs/` directory is gitignored — filled-in copies should never
be committed.

### Local development

The start script automatically runs `eas env:pull` to sync environment variables
(API keys, etc.) from EAS before launching Expo. If you're not logged in to EAS
or prefer to work offline, manually create `code/.env` with your `API_KEY_1`
through `API_KEY_5` values.

### Per-instance overrides

If you manage multiple branded instances, you can create per-instance overrides
in `code/app-configs/`:

- `<slug>.projectOwner.json` for instance-specific project owner settings
- `<slug>.google-services.json` for instance-specific Firebase config

These are resolved by the app slug defined in `apps.json`.

## How it works

`code/app.config.js` reads these files at Expo evaluation time using the
`APP_ENV` environment variable to select the correct instance from `apps.json`.

## EAS submit credentials

`code/eas.json` references submit credentials via `$VAR` environment variable
syntax. Set these as EAS project environment variables in the Expo dashboard or
export them in your shell before running `eas submit`:

| Variable | Source |
|---|---|
| `ASC_API_KEY_PATH` | `apps.json` `ascApiKeyPath` |
| `ASC_API_KEY_ISSUER_ID` | `apps.json` `ascApiKeyIssuerId` |
| `ASC_API_KEY_ID` | `apps.json` `ascApiKeyId` |
| `APPLE_ID` | `projectOwner.json` `devAppleId` |
| `ASC_APP_ID` | `apps.json` `ascAppId` |
| `APPLE_TEAM_ID` | `apps.json` `appleTeamId` |
| `GOOGLE_SERVICE_KEY_PATH` | `apps.json` `googleServiceKeyPath` |
