import { requireUserId } from './_helpers';
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
