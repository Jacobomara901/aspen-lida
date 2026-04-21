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

const TASKS = [
  { title: 'Create EAS Channel', value: 'create-channel' },
  { title: 'Assign New Branch', value: 'assign-branch' },
  { title: 'Delete Branch', value: 'delete-branch' },
];

function run(cmd, site) {
  execSync(cmd, {
    cwd: CODE_DIR,
    stdio: 'inherit',
    env: { ...process.env, APP_ENV: site },
  });
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Aspen LiDA EAS Manager');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { task } = await prompts({
    type: 'select',
    name: 'task',
    message: 'What do you want to do?',
    choices: TASKS,
  });
  if (!task) process.exit(0);

  const { slug } = await prompts({
    type: 'select',
    name: 'slug',
    message: 'Select instance',
    choices: [...instances, 'all'].map((name) => ({ title: name, value: name })),
  });
  if (!slug) process.exit(0);

  const { channel } = await prompts({
    type: 'select',
    name: 'channel',
    message: 'Release channel',
    choices: ['production', 'beta', 'alpha', 'development'].map((c) => ({ title: c, value: c })),
  });
  if (!channel) process.exit(0);

  const sites = slug === 'all' ? instances : [slug];

  if (task === 'create-channel') {
    const { name } = await prompts({ type: 'text', name: 'name', message: 'Channel name to create' });
    if (!name) process.exit(0);

    for (const site of sites) {
      console.log(`\nCreating channel "${name}" for ${site}...`);
      run(`eas channel:create "${name}"`, site);
    }
  }

  if (task === 'assign-branch') {
    const { branch } = await prompts({ type: 'text', name: 'branch', message: 'Branch name to create and assign' });
    if (!branch) process.exit(0);

    for (const site of sites) {
      console.log(`\nCreating branch "${branch}" for ${site}...`);
      run(`eas branch:create "${branch}"`, site);
      console.log(`Pointing channel "${channel}" at branch "${branch}"...`);
      run(`eas channel:edit "${channel}" --branch "${branch}"`, site);
    }
  }

  if (task === 'delete-branch') {
    const { branch } = await prompts({ type: 'text', name: 'branch', message: 'Branch name to delete' });
    if (!branch) process.exit(0);

    for (const site of sites) {
      console.log(`\nDeleting branch "${branch}" for ${site}...`);
      run(`eas branch:delete "${branch}"`, site);
    }
  }

  console.log('\nDone.');
}

main();
