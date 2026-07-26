import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { mutation, query } from './_generated/server';

export const listForRange = query({
  args: { fromISO: v.string(), toISO: v.string() },
  handler: async (ctx, { fromISO, toISO }) => {
    const userId = await requireUserId(ctx);
    // Range-scan the compound index rather than loading every entry the user has
    // ever planned and filtering in JS — a two-year-old account would otherwise
    // fetch thousands of rows to render one week.
    return ctx.db
      .query('calendarEntries')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', userId).gte('date', fromISO).lte('date', toISO),
      )
      .collect();
  },
});

export const set = mutation({
  args: {
    entryKey: v.string(),
    date: v.string(),
    slot: v.string(),
    recipeId: v.optional(v.string()),
    recipeTitle: v.string(),
    recipeThumbnail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('calendarEntries')
      .withIndex('by_user_and_key', (q) =>
        q.eq('userId', userId).eq('entryKey', args.entryKey),
      )
      .unique();
    const data = { ...args, userId };
    if (existing) {
      await ctx.db.replace(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert('calendarEntries', data);
  },
});

export const remove = mutation({
  args: { entryKey: v.string() },
  handler: async (ctx, { entryKey }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('calendarEntries')
      .withIndex('by_user_and_key', (q) =>
        q.eq('userId', userId).eq('entryKey', entryKey),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
