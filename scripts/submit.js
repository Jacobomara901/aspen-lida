#!/usr/bin/env node
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '..', 'code', 'node_modules');
require('module').Module._initPaths();

const { execSync } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');

const CONFIG_DIR = path.resolve(__dirname, '..', 'code', 'app-configs');
const CODE_DIR = path.resolve(__dirname, '..', 'code');
const EAS_JSON = path.join(CODE_DIR, 'eas.json');

const apps = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'apps.json'), 'utf8'));
const easOriginal = fs.readFileSync(EAS_JSON, 'utf8');
const eas = JSON.parse(easOriginal);
const instances = Object.keys(apps);
const submitProfiles = Object.keys(eas.submit || {});

function stripPlaceholders(block) {
  const out = {};
  for (const [k, v] of Object.entries(block)) {
    if (typeof v === 'string' && v.startsWith('$')) continue;
    out[k] = v;
  }
  return out;
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Aspen LiDA Submit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { profile } = await prompts({
    type: 'select',
    name: 'profile',
    message: 'Submit profile',
    choices: submitProfiles.map((c) => ({ title: c, value: c })),
  });
  if (!profile) process.exit(0);

  const { slug } = await prompts({
    type: 'select',
    name: 'slug',
    message: 'Select instance',
    choices: instances.map((name) => ({ title: name, value: name })),
  });
  if (!slug) process.exit(0);

  const { platform } = await prompts({
    type: 'select',
    name: 'platform',
    message: 'Platform(s)',
    choices: ['ios', 'android', 'all'].map((p) => ({ title: p, value: p })),
  });
  if (!platform) process.exit(0);

  const platforms = platform === 'all' ? ['ios', 'android'] : [platform];

  const patched = JSON.parse(easOriginal);
  for (const p of ['ios', 'android']) {
    for (const prof of Object.keys(patched.submit)) {
      if (patched.submit[prof][p]) {
        patched.submit[prof][p] = stripPlaceholders(patched.submit[prof][p]);
      }
    }
  }

  fs.writeFileSync(EAS_JSON, JSON.stringify(patched, null, 2));
  try {
    for (const p of platforms) {
      console.log(`\nSubmitting ${slug} (${p}) with profile "${profile}"...`);
      try {
        execSync(
          `eas submit --platform ${p} --profile ${profile}`,
          { cwd: CODE_DIR, stdio: 'inherit', env: { ...process.env, APP_ENV: slug } }
        );
      } catch {
        console.error(`\nSubmit failed for ${slug} (${p}).\n`);
      }
    }
  } finally {
    fs.writeFileSync(EAS_JSON, easOriginal);
  }

  console.log('\nDone.');
}

main();
