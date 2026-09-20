#!/usr/bin/env node
/**
 * Refuses to build a release against development credentials.
 *
 * Runs on EAS before install, so a misconfigured production build fails in
 * about ten seconds instead of producing an artifact that looks fine and
 * quietly authenticates real users against a development Clerk instance. That
 * failure mode is invisible until someone's account doesn't exist.
 *
 * Also runnable locally: `node scripts/check-build-env.js production`
 */

const profile = process.env.EAS_BUILD_PROFILE ?? process.argv[2] ?? '';

// Profiles that reach people who are not us.
const RELEASE_PROFILES = new Set(['production']);

if (!RELEASE_PROFILES.has(profile)) {
  console.log(`[check-build-env] profile "${profile || '(none)'}" — no release checks needed.`);
  process.exit(0);
}

const problems = [];

const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
if (!clerkKey) {
  problems.push('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.');
} else if (clerkKey.startsWith('pk_test_')) {
  problems.push(
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is a test key (pk_test_…). A production ' +
      'build must use pk_live_… from a Clerk production instance, or real users ' +
      'sign in against the development instance and their accounts do not exist.',
  );
}

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';
if (!convexUrl) {
  problems.push('EXPO_PUBLIC_CONVEX_URL is missing.');
} else if (convexUrl.includes('intent-kingfisher-855')) {
  problems.push(
    `EXPO_PUBLIC_CONVEX_URL points at the dev deployment (${convexUrl}). ` +
      'A production build must use the production deployment.',
  );
}

if (problems.length > 0) {
  console.error('\n[check-build-env] This production build is misconfigured:\n');
  for (const p of problems) console.error('  • ' + p);
  console.error('\nFix eas.json (production profile) and build again.\n');
  process.exit(1);
}

console.log('[check-build-env] production credentials look right.');
