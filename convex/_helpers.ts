import type { QueryCtx, MutationCtx } from './_generated/server';

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }
  return identity.subject;
}

/** Kept in step with hooks/useEntitlement.ts — the client shows it, this enforces it. */
export const TRIAL_DAYS = 21;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/** Subscription states that still grant access, including cancelled-not-yet-expired. */
const PREMIUM_STATUSES = new Set(['active', 'on_trial', 'cancelled']);

/**
 * Whether this account may use a paid feature, decided on the server.
 *
 * The client has always worked this out from Clerk's createdAt, which is fine
 * for showing "5 days remaining" but enforces nothing — anyone calling these
 * functions directly had premium indefinitely, because the backend's rule was
 * "no subscription row means still on trial".
 */
export async function hasPremiumAccess(ctx: QueryCtx, userId: string): Promise<boolean> {
  const sub = await ctx.db
    .query('subscriptions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  if (sub) return PREMIUM_STATUSES.has(sub.status);

  // No subscription: they're in the trial, if it hasn't run out.
  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();

  // An account we've never recorded is one we've just met — treat it as day
  // one rather than locking out someone whose profile write hasn't landed.
  if (!profile?.trialStartedAt) return true;
  return Date.now() < profile.trialStartedAt + TRIAL_MS;
}
