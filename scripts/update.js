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
  console.log('Aspen LiDA Updater');
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

  const { ota } = await prompts({
    type: 'confirm',
    name: 'ota',
    message: 'Over-the-air update?',
    initial: false,
  });

  let branchName, comment;
  if (ota) {
    ({ branchName } = await prompts({ type: 'text', name: 'branchName', message: 'Branch to send OTA update to' }));
    ({ comment } = await prompts({ type: 'text', name: 'comment', message: 'Comment about the update' }));
    if (!branchName) process.exit(0);
  }

  const { platform } = await prompts({
    type: 'select',
    name: 'platform',
    message: 'Platform(s)',
    choices: ['ios', 'android', 'all'].map((p) => ({ title: p, value: p })),
  });
  if (!platform) process.exit(0);

  const sites = slug === 'all' ? instances : [slug];

  for (const site of sites) {
    console.log(`\nUpdating ${site} in ${channel} for ${platform} platform(s)...`);

    const cmd = ota
      ? `eas update --branch "${branchName}" --message "${comment}" --platform ${platform}`
      : `eas build --platform ${platform} --profile ${channel} --no-wait`;

    execSync(cmd, {
      cwd: CODE_DIR,
      stdio: 'inherit',
      env: { ...process.env, APP_ENV: site },
    });
  }

  console.log('\nDone.');
}

main();
