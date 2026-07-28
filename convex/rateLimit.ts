import { v } from 'convex/values';

import { internalMutation } from './_generated/server';

/**
 * Fixed-window rate limiting.
 *
 * Two things are being protected, and they need different mechanisms:
 *
 *  1. **Per-user limits** stop one account from abusing an endpoint — e.g.
 *     scripting search with random strings, where every unique query is a cache
 *     miss and therefore a paid upstream call.
 *
 *  2. **A global daily cap** protects the bill. Per-user limits alone don't:
 *     500 well-behaved users are just as capable of exhausting the Spoonacular
 *     quota as one malicious one. The global cap is the backstop that turns a
 *     surprise invoice into degraded-but-working behaviour.
 *
 * Fixed windows can allow up to 2x the limit across a window boundary. That's a
 * known trade-off and fine here — the alternative (sliding log) costs a row per
 * request, which is worse than the burst it prevents.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export type RateLimitBucket =
  | 'search'
  | 'recipeDetail'
  | 'feed'
  | 'checkout'
  | 'subscriptionChange';

/**
 * Per-user limits. Set generously — these should never bite a real person, only
 * a script. Each unit here is one *cache miss*, not one request; browsing
 * cached content is unlimited and free.
 */
export const USER_LIMITS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  // Unique searches. A person exploring dinner ideas might do 10-15 in a
  // session; 40/hour leaves plenty of headroom.
  search: { limit: 40, windowMs: HOUR },
  // Opening recipes we haven't cached yet.
  recipeDetail: { limit: 80, windowMs: HOUR },
  // Rails, cuisine grids, macro lookups, dish of the day.
  feed: { limit: 60, windowMs: HOUR },
  // Starting a Lemon Squeezy checkout.
  checkout: { limit: 1, windowMs: HOUR },
  // Cancelling / resuming a subscription.
  subscriptionChange: { limit: 5, windowMs: HOUR },
};

/**
 * Ceiling on paid Spoonacular calls per day across the whole userbase.
 *
 * Sized against the plan you're on: the free tier is ~150 points/day and a
 * miss costs 1-1.5 points. 120 leaves headroom for the cron and a margin of
 * error. Raise this when you upgrade the Spoonacular plan.
 */
export const GLOBAL_DAILY_UPSTREAM_LIMIT = 120;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function userKey(userId: string, bucket: RateLimitBucket): string {
  return `${userId}:${bucket}`;
}

export function globalKey(): string {
  return `global:spoonacular:${utcDay()}`;
}

/**
 * Consume one unit against a key. Returns whether it was allowed and when the
 * window resets, rather than throwing, so callers can decide how to degrade.
 */
export const consume = internalMutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { key, limit, windowMs }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    // First use, or the previous window has expired — start a fresh one.
    if (!existing || now - existing.windowStart >= windowMs) {
      const row = { key, windowStart: now, count: 1 };
      if (existing) {
        await ctx.db.replace(existing._id, row);
      } else {
        await ctx.db.insert('rateLimits', row);
      }
      return { allowed: true, retryAfterMs: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterMs: existing.windowStart + windowMs - now,
      };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true, retryAfterMs: 0 };
  },
});

/** Drop counter rows whose window closed long ago. */
export const pruneStale = internalMutation({
  args: { olderThanMs: v.number() },
  handler: async (ctx, { olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;
    const stale = await ctx.db
      .query('rateLimits')
      .withIndex('by_window', (q) => q.lt('windowStart', cutoff))
      .collect();
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return stale.length;
  },
});
