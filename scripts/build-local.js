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
  console.log('Aspen LiDA Local Build');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { channel } = await prompts({
    type: 'select',
    name: 'channel',
    message: 'Release channel',
    choices: ['production', 'beta', 'alpha', 'development'].map((c) => ({ title: c, value: c })),
  });
  if (!channel) process.exit(0);

  const { slug } = await prompts({
    type: 'select',
    name: 'slug',
    message: 'Select instance',
    choices: [...instances, 'all'].map((name) => ({ title: name, value: name })),
  });
  if (!slug) process.exit(0);

  const { platform } = await prompts({
    type: 'select',
    name: 'platform',
    message: 'Platform(s)',
    choices: ['ios', 'android', 'all'].map((p) => ({ title: p, value: p })),
  });
  if (!platform) process.exit(0);

  console.log('\nLocal builds run synchronously and can take 20+ minutes each.');
  console.log(`Artifacts are written to ${CODE_DIR}/\n`);

  const sites = slug === 'all' ? instances : [slug];

  for (const site of sites) {
    console.log(`Building ${site} in ${channel} for ${platform} platform(s)...`);

    execSync(
      `eas build --platform ${platform} --profile ${channel} --local --non-interactive --verbose-logs --build-logger-level debug`,
      {
        cwd: CODE_DIR,
        stdio: 'inherit',
        env: { ...process.env, APP_ENV: site },
      }
    );
  }

  console.log('\nDone.');
}

main();
