import { v } from 'convex/values';

import { hasPremiumAccess, requireUserId } from './_helpers';
import { mutation, query } from './_generated/server';

/**
 * Account-level state, as opposed to the per-device settings in
 * providers/settings-provider.tsx.
 *
 * Right now that means one thing: whether this account has been through
 * onboarding. It has to live server-side because the question it answers is
 * "has this *person* seen the welcome flow", and the answer must hold when
 * they reinstall, get a new phone, or sign back in after resetting a password.
 */

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
  },
});

export const markOnboarded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    // Keep the first timestamp. Re-running onboarding shouldn't rewrite when
    // this account actually joined.
    if (existing) return existing._id;
    return ctx.db.insert('userProfiles', { userId, onboardedAt: Date.now() });
  },
});

/**
 * Records when this account's trial began, the first time we see it.
 *
 * `accountCreatedAt` comes from Clerk via the client so an existing user's
 * trial dates from when they actually signed up rather than from whenever this
 * table first noticed them. It's clamped to the present: a caller can only ever
 * move their trial start *earlier*, which shortens their own trial, so lying
 * about it gains nothing.
 */
export const ensureProfile = mutation({
  args: { accountCreatedAt: v.optional(v.number()) },
  handler: async (ctx, { accountCreatedAt }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const now = Date.now();
    const started = Math.min(accountCreatedAt ?? now, now);

    if (!existing) {
      return ctx.db.insert('userProfiles', { userId, trialStartedAt: started });
    }
    if (existing.trialStartedAt == null) {
      await ctx.db.patch(existing._id, { trialStartedAt: started });
    }
    return existing._id;
  },
});

/** Server's own verdict on premium access, for the client to display honestly. */
export const myAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return { hasPremium: await hasPremiumAccess(ctx, userId) };
  },
});
