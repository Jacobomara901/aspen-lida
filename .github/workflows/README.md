# GitHub Actions for Aspen LiDA

Keeping the fork in sync with `aspen-discovery/aspen-lida` is done manually
(`git fetch upstream` + push); there is deliberately no scheduled sync workflow.

## App Builds (`app-builds.yml`)

Builds LiDA locally on GitHub runners with `eas build --local` and submits to the app
stores, replacing the interactive `updater.sh` flow. The existing `scripts/copyConfig.js`
and `scripts/updateConfig.js` are reused unchanged — CI reconstructs the gitignored
`app-configs/` files from repository secrets first.

### Triggers
- Push that changes `deploy/build.json` on the `deploy` branch. Bump the build number
  there and push to kick off a production build + submit.
- Manual run (`workflow_dispatch`) with instance, profile, platform, and submit toggle.

### Required secrets
Generate the base64 values from a working local checkout:

| Secret | Contents | How to create |
| --- | --- | --- |
| `EXPO_TOKEN` | Expo access token for the project owner account | expo.dev → Account settings → Access tokens |
| `LIDA_APPS_JSON` | `app-configs/apps.json` | `base64 -i app-configs/apps.json` |
| `LIDA_PROJECT_OWNER_JSON` | `app-configs/projectOwner.json` | `base64 -i app-configs/projectOwner.json` |
| `LIDA_ENV_FILE` | `app-configs/.env` | `base64 -i app-configs/.env` |
| `LIDA_GOOGLE_SERVICES_JSON` | `app-configs/google-services.json` (FCM config) | `base64 -i app-configs/google-services.json` |

### Optional secrets
| Secret | Contents |
| --- | --- |
| `LIDA_PLAY_SERVICE_ACCOUNT` | Base64 of the Google Play service-account key, written to `code/GOOGLE_SERVICES_JSON` for Android submission |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for the Apple ID used by `eas submit` |
| `SLACK_WEBHOOK` | Incoming webhook for build notifications |

Submission credentials otherwise come from EAS-stored credentials: unresolved
placeholder values in `eas.json` (`$VAR`, `0`, `not_needed`) are stripped before
submitting so `eas submit` falls back to the credentials stored on expo.dev.

## Notes
- Workflows only appear in the Actions tab once they exist on the default branch
  (`26.03.00`); scheduled runs also execute from there.
- `deploy/build.json` is the tracked CI copy of the gitignored `app-configs/build.json`;
  CI copies it into place before running `updateConfig.js`.
- Commits containing `[skip ci]` are skipped by GitHub natively for push triggers.
