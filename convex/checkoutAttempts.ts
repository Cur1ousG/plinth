import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';

export const recentForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query('checkoutAttempts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .first();
  },
});

export const record = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query('checkoutAttempts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { attemptedAt: Date.now() });
    } else {
      await ctx.db.insert('checkoutAttempts', { userId, attemptedAt: Date.now() });
    }
  },
});
