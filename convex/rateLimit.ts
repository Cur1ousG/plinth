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

export type RateLimitBucket = 'search' | 'recipeDetail' | 'feed' | 'subscriptionChange';

/**
 * Per-user limits, counted in *cache misses* — browsing cached content is
 * unlimited and free. These stop one person monopolising the shared budget;
 * the global point ceiling is what protects the bill.
 *
 * They used to be far larger than the budget they drew on: 40 searches/hour
 * for a single user is ~48 points, more than an entire day's allowance. On a
 * 50-point plan a per-user cap only means anything if it's a fraction of the
 * daily total, so these are sized against GLOBAL_DAILY_POINT_LIMIT rather than
 * against what one person might plausibly do.
 */
export const USER_LIMITS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  // ~12 points if every one misses — about a quarter of the daily budget.
  search: { limit: 10, windowMs: HOUR },
  // Cheapest call we make (1.1) and the most natural to repeat while browsing.
  recipeDetail: { limit: 15, windowMs: HOUR },
  // Rails, cuisine grids, macro lookups. Mostly shared, so misses are rare.
  feed: { limit: 10, windowMs: HOUR },
  // Cancelling / resuming a subscription. Not a Spoonacular cost.
  subscriptionChange: { limit: 5, windowMs: HOUR },
  // Starting a checkout is intentionally absent — see createCheckoutSession.
};

/**
 * The Spoonacular budget, in points — the unit they actually bill in.
 *
 * This used to cap *calls* at 120/day against an assumed 150-point plan. Both
 * halves were wrong. The free plan is 50 points/day, and a call is never one
 * point: complexSearch is 1 + 0.01/result, addRecipeInformation adds 0.025 per
 * recipe, and a nutrient filter adds a whole point. 120 calls is really ~156
 * points, so the ceiling sat over three times above the real one and could
 * never fire before Spoonacular's own.
 *
 * Change DAILY_POINT_BUDGET and nothing else when the plan changes:
 *   Free $0 → 50   Cook $29 → 1500   Culinarian $79 → 4500   Chef $149 → 10000
 */
export const DAILY_POINT_BUDGET = 50;

/**
 * Held back for the daily cron, which warms the shared rails before anyone
 * opens the app and so can't be allowed to fail. Measured at ~4.7 points
 * (trending 1.06 + quick 1.35 + weekend 1.28 + dish-of-day 1.01).
 */
const CRON_RESERVE_POINTS = 5;

/** What's left for user-triggered cache misses. */
export const GLOBAL_DAILY_POINT_LIMIT = DAILY_POINT_BUDGET - CRON_RESERVE_POINTS;

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
    /**
     * How much this request costs. Defaults to 1 so per-user counters keep
     * counting requests; the global counter passes Spoonacular points, which
     * are fractional (a search is 1.2, a macro lookup 2.42).
     */
    cost: v.optional(v.number()),
    /**
     * Record the spend but never refuse it. For the daily cron, which has a
     * reserve set aside and must not be blocked by user traffic — we still
     * want its usage on the books so the counter reflects the real bill.
     */
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { key, limit, windowMs, cost, force }) => {
    const now = Date.now();
    const charge = cost ?? 1;
    const existing = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    // First use, or the previous window has expired — start a fresh one.
    if (!existing || now - existing.windowStart >= windowMs) {
      if (charge > limit && !force) {
        return { allowed: false, retryAfterMs: windowMs };
      }
      const row = { key, windowStart: now, count: charge };
      if (existing) {
        await ctx.db.replace(existing._id, row);
      } else {
        await ctx.db.insert('rateLimits', row);
      }
      return { allowed: true, retryAfterMs: 0 };
    }

    // Would this request take us past the ceiling? Checked against the cost of
    // *this* request, not merely whether we're already at the limit — a 2.42
    // point macro lookup shouldn't slip through on a budget with 0.5 left.
    if (existing.count + charge > limit && !force) {
      return {
        allowed: false,
        retryAfterMs: existing.windowStart + windowMs - now,
      };
    }

    await ctx.db.patch(existing._id, { count: existing.count + charge });
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
