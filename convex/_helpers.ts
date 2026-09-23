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

/**
 * Subscription states that still grant access.
 *
 * `cancelled` is included because cancelling means "don't renew" — the period
 * already paid for still runs. `past_due` is included for the same reason: it
 * means a renewal payment failed and the store is retrying, and both Play and
 * the App Store keep the subscription alive through a grace period (7 days, set
 * on the base plan). Cutting someone off the instant their bank declines a
 * payment they fully intend to make is how you lose a subscriber over a card
 * that expired. `currentPeriodEnd` still bounds it, so access ends when the
 * grace period does.
 */
const PREMIUM_STATUSES = new Set(['active', 'on_trial', 'cancelled', 'past_due']);

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
  if (sub) {
    if (!PREMIUM_STATUSES.has(sub.status)) return false;
    // 'cancelled' and 'past_due' are both "paid up to a date, not renewing
    // normally", so they have to be bounded by that date. Otherwise a missed
    // EXPIRATION webhook leaves someone premium forever. 'active' and
    // 'on_trial' are bounded by the store telling us they ended.
    if (sub.status === 'cancelled' || sub.status === 'past_due') {
      return sub.currentPeriodEnd > Date.now();
    }
    return true;
  }

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
