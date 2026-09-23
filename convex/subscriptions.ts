import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { internalMutation, query } from './_generated/server';

export const getMyStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
  },
});

/**
 * RevenueCat's view of a subscription, which is the only view that matters
 * once purchases go through Play and the App Store.
 *
 * Matched on userId rather than a store subscription id: RevenueCat is the
 * single subscription per person across both stores, so there is nothing to
 * disambiguate, and a Play purchase replacing a Lemon Squeezy one should
 * overwrite the same row rather than leave two.
 */
export const upsertFromRevenueCat = internalMutation({
  args: {
    userId: v.string(),
    status: v.string(),
    plan: v.string(),
    currentPeriodEnd: v.number(),
    provider: v.string(),
    cancelledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert('subscriptions', args);
  },
});
