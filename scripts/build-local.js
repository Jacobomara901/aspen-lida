#!/usr/bin/env node
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '..', 'code', 'node_modules');
require('module').Module._initPaths();

const { execSync } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');

const CONFIG_DIR = path.resolve(__dirname, '..', 'code', 'app-configs');
const CODE_DIR = path.resolve(__dirname, '..', 'code');
const BUILDS_DIR = path.resolve(__dirname, '..', 'builds');

const apps = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'apps.json'), 'utf8'));
const eas = JSON.parse(fs.readFileSync(path.join(CODE_DIR, 'eas.json'), 'utf8'));
const instances = Object.keys(apps);

function easEnvironment(profile) {
  const config = eas.build[profile];
  if (config.environment) return config.environment;
  if (config.extends) return easEnvironment(config.extends);
  return 'production';
}

function pullGoogleServicesFile(slug, environment) {
  const targetDir = path.join(CODE_DIR, '.eas', '.env');
  const target = path.join(targetDir, 'GOOGLE_SERVICES_JSON');

  console.log(`Pulling google-services.json from EAS (${environment})...`);
  const output = execSync(
    `eas env:get ${environment} --variable-name GOOGLE_SERVICES_JSON --format short --non-interactive`,
    { cwd: CODE_DIR, env: { ...process.env, APP_ENV: slug }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const json = output.substring(output.indexOf('{'));
  JSON.parse(json);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(target, json);
  console.log(`Wrote ${target}`);
}

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

  console.log('\nLocal builds run synchronously and can take 20+ minutes each.\n');

  const sites = slug === 'all' ? instances : [slug];
  const platforms = platform === 'all' ? ['ios', 'android'] : [platform];
  const environment = easEnvironment(channel);

  for (const site of sites) {
    pullGoogleServicesFile(site, environment);
    const outputDir = path.join(BUILDS_DIR, site);
    fs.mkdirSync(outputDir, { recursive: true });

    for (const p of platforms) {
      const timestamp = Date.now();
      const ext = p === 'ios' ? 'ipa' : 'aab';
      const outputFile = path.join(outputDir, `${site}-${channel}-${p}-${timestamp}.${ext}`);

      console.log(`Building ${site} in ${channel} for ${p}...`);
      console.log(`Output: ${outputFile}`);

      try {
        execSync(
          `eas build --platform ${p} --profile ${channel} --local --non-interactive --output "${outputFile}"`,
          {
            cwd: CODE_DIR,
            stdio: 'inherit',
            env: { ...process.env, APP_ENV: site },
          }
        );
      } catch {
        console.error(`\nBuild failed for ${site} (${p}). Continuing with remaining builds.\n`);
      }
    }
  }

  console.log('\nDone.');
}

main();
