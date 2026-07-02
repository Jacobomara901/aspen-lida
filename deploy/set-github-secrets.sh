#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-Jacobomara901/aspen-lida}"
cd "$(dirname "$0")/.."

if ! gh auth status > /dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login -h github.com"
  exit 1
fi

check_name_drift () {
  local referenced managed missing extra
  referenced=$(grep -rhoE 'secrets\.[A-Z_]+' .github/workflows/*.yml | sed 's/secrets\.//' | grep -v '^GITHUB_TOKEN$' | sort -u)
  managed=$(grep -hoE '^set_(file|value)_secret [A-Z_]+' "$0" | awk '{print $2}' | sort -u)
  missing=$(comm -23 <(echo "$referenced") <(echo "$managed"))
  extra=$(comm -13 <(echo "$referenced") <(echo "$managed"))
  if [ -n "$extra" ]; then
    echo "⚠️  Set by this script but not referenced by any workflow:"
    echo "$extra"
  fi
  if [ -n "$missing" ]; then
    echo "❌ Referenced by workflows but not set by this script:"
    echo "$missing"
    exit 1
  fi
}

check_name_drift

set_file_secret () {
  local name=$1 file=$2
  if [ ! -f "$file" ]; then
    echo "⚠️  $file not found — skipped $name"
    return
  fi
  base64 -i "$file" | gh secret set "$name" --repo "$REPO"
  echo "✅ $name (from $file)"
}

set_value_secret () {
  local name=$1 value="${!1:-}"
  if [ -z "$value" ] && [ -t 0 ]; then
    read -r -s -p "Enter $name (blank to skip): " value
    echo
  fi
  if [ -z "$value" ]; then
    echo "⏭️  skipped $name"
    return
  fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  echo "✅ $name"
}

set_file_secret LIDA_APPS_JSON app-configs/apps.json
set_file_secret LIDA_PROJECT_OWNER_JSON app-configs/projectOwner.json
set_file_secret LIDA_ENV_FILE app-configs/.env
set_file_secret LIDA_GOOGLE_SERVICES_JSON app-configs/google-services.json
set_file_secret LIDA_PLAY_SERVICE_ACCOUNT code/GOOGLE_SERVICES_JSON

set_value_secret EXPO_TOKEN
set_value_secret EXPO_APPLE_APP_SPECIFIC_PASSWORD
set_value_secret SLACK_WEBHOOK

echo
gh secret list --repo "$REPO"
