import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('cartItems')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    quantity: v.optional(v.string()),
    fromRecipeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return ctx.db.insert('cartItems', { ...args, userId, checked: false });
  },
});

export const addMany = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.optional(v.string()),
        fromRecipeId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const userId = await requireUserId(ctx);
    for (const item of items) {
      await ctx.db.insert('cartItems', { ...item, userId, checked: false });
    }
  },
});

export const toggle = mutation({
  args: { id: v.id('cartItems') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.userId !== userId) return;
    await ctx.db.patch(id, { checked: !item.checked });
  },
});

export const remove = mutation({
  args: { id: v.id('cartItems') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.userId !== userId) return;
    await ctx.db.delete(id);
  },
});

export const clearChecked = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query('cartItems')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    for (const r of rows) {
      if (r.checked) await ctx.db.delete(r._id);
    }
  },
});
