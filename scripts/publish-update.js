#!/usr/bin/env node
/**
 * Publishes an EAS Update with the right credentials for the channel.
 *
 *   node scripts/publish-update.js production "Fix the thing"
 *   node scripts/publish-update.js preview    "Fix the thing"
 *
 * Why this exists: `eas update` bundles EXPO_PUBLIC_* from your local
 * environment — .env and .env.local — not from the eas.json build profile. So
 * running `eas update --channel production` on a dev machine publishes a bundle
 * pointing at the dev Convex deployment and the dev Clerk instance, to every
 * user of the production app. It looks like it worked. The app even runs. It
 * just talks to the wrong backend, and real accounts don't exist there.
 *
 * That happened once, to a TestFlight build, on 25 September 2026.
 *
 * This reads the env block for the matching profile out of eas.json and hands
 * exactly those values to the update, so the bundle matches what a build of
 * that profile would contain.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , channel, ...messageParts] = process.argv;

const CHANNEL_TO_PROFILE = {
  production: 'production',
  preview: 'internal',
  development: 'development',
};

if (!channel || !CHANNEL_TO_PROFILE[channel]) {
  console.error(
    `Usage: node scripts/publish-update.js <${Object.keys(CHANNEL_TO_PROFILE).join('|')}> "message"`,
  );
  process.exit(1);
}

const message = messageParts.join(' ').trim();
if (!message) {
  console.error('A message is required — it is what you read when deciding whether to roll back.');
  process.exit(1);
}

const profileName = CHANNEL_TO_PROFILE[channel];
const easJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));
const profileEnv = easJson.build?.[profileName]?.env;

if (!profileEnv) {
  console.error(`No env block for build profile "${profileName}" in eas.json.`);
  process.exit(1);
}

// Start from the current environment so PATH and credentials survive, then
// overwrite every EXPO_PUBLIC_* the profile defines. Anything the profile does
// not mention is deleted rather than inherited, so a stray value in .env can't
// leak into the bundle.
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
}
Object.assign(env, profileEnv);

// .env files are read by the bundler regardless of what we set here, and they
// win for keys we haven't set. Turning them off entirely is the only way to be
// certain the bundle carries the profile's values and nothing else.
env.EXPO_NO_DOTENV = '1';

console.log(`[publish-update] channel "${channel}" using eas.json profile "${profileName}"`);
for (const [k, v] of Object.entries(profileEnv)) {
  const shown = /KEY|SECRET|TOKEN/i.test(k) ? v.slice(0, 12) + '…' : v;
  console.log(`  ${k}=${shown}`);
}

// `shell: true` because Node refuses to spawn a .cmd directly on Windows (the
// fix for CVE-2024-27980), and npx is npx.cmd there. Without it this failed
// silently: the env printed, the update never ran, and nothing said why.
// The message is quoted because a shell splits on spaces.
const result = spawnSync(
  'npx',
  ['eas', 'update', '--channel', channel, '--message', JSON.stringify(message)],
  { stdio: 'inherit', env, shell: true },
);

if (result.error) {
  console.error(`\n[publish-update] could not run eas: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
