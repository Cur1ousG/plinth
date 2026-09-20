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

export const markRefundedBySubscriptionId = internalMutation({
  args: { lemonSqueezySubscriptionId: v.string() },
  handler: async (ctx, { lemonSqueezySubscriptionId }) => {
    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_subscription_id', (q) =>
        q.eq('lemonSqueezySubscriptionId', lemonSqueezySubscriptionId),
      )
      .first();
    if (!sub) return;
    await ctx.db.patch(sub._id, {
      status: 'expired',
      currentPeriodEnd: Date.now(),
      cancelledAt: Date.now(),
    });
  },
});

export const upsertFromWebhook = internalMutation({
  args: {
    userId: v.string(),
    status: v.string(),
    plan: v.string(),
    currentPeriodEnd: v.number(),
    lemonSqueezySubscriptionId: v.string(),
    lemonSqueezyCustomerId: v.string(),
    customerPortalUrl: v.optional(v.string()),
    updatePaymentMethodUrl: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Prefer matching by Lemon Squeezy subscription id (single source of truth).
    const bySubId = await ctx.db
      .query('subscriptions')
      .withIndex('by_subscription_id', (q) =>
        q.eq('lemonSqueezySubscriptionId', args.lemonSqueezySubscriptionId),
      )
      .first();

    if (bySubId) {
      await ctx.db.patch(bySubId._id, args);
      return bySubId._id;
    }

    // Fall back to matching by user id for the very first webhook event.
    const byUser = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (byUser) {
      await ctx.db.patch(byUser._id, args);
      return byUser._id;
    }

    return ctx.db.insert('subscriptions', args);
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
