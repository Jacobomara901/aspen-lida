#!/usr/bin/env node
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '..', 'code', 'node_modules');
require('module').Module._initPaths();

const { execSync } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');

const CONFIG_DIR = path.resolve(__dirname, '..', 'code', 'app-configs');
const CODE_DIR = path.resolve(__dirname, '..', 'code');

const apps = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'apps.json'), 'utf8'));
const instances = Object.keys(apps);

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Aspen LiDA Launcher');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { site } = await prompts({
    type: 'select',
    name: 'site',
    message: 'Select an instance',
    choices: instances.map((name) => ({ title: name, value: name })),
  });
  if (!site) process.exit(0);

  const { mode } = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Expo server mode',
    choices: [
      { title: 'Standard', value: 'standard' },
      { title: 'Development', value: 'development' },
      { title: 'Production', value: 'production' },
    ],
  });
  if (!mode) process.exit(0);

  process.env.APP_ENV = site;

  try {
    execSync('eas env:pull --environment development', { cwd: CODE_DIR, stdio: 'pipe' });
    console.log('Synced environment variables from EAS.');
  } catch {
    console.log('Could not pull EAS env vars (are you logged in?). Using local .env if present.');
  }

  const modeFlags = {
    development: '--dev-client --clear',
    production: '--no-dev --minify --clear',
    standard: '--clear',
  };

  execSync(`npx expo start ${modeFlags[mode]}`, {
    cwd: CODE_DIR,
    stdio: 'inherit',
    env: { ...process.env, APP_ENV: site },
  });
}

main();
