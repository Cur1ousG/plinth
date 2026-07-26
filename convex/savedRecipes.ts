import { v } from 'convex/values';

import { requireUserId } from './_helpers';
import { mutation, query } from './_generated/server';

const ingredientShape = v.object({
  name: v.optional(v.string()),
  amount: v.optional(v.number()),
  unit: v.optional(v.string()),
  original: v.string(),
});

const nutrientShape = v.object({
  name: v.string(),
  amount: v.number(),
  unit: v.string(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query('savedRecipes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return rows.sort((a, b) => b.savedAt - a.savedAt);
  },
});

export const save = mutation({
  args: {
    recipeId: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    siteName: v.optional(v.string()),
    ingredients: v.array(ingredientShape),
    instructions: v.optional(v.string()),
    totalTime: v.optional(v.string()),
    yields: v.optional(v.string()),
    nutrients: v.optional(v.array(nutrientShape)),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('savedRecipes')
      .withIndex('by_user_and_recipe', (q) =>
        q.eq('userId', userId).eq('recipeId', args.recipeId),
      )
      .unique();
    const data = { ...args, userId, savedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert('savedRecipes', data);
  },
});

export const remove = mutation({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('savedRecipes')
      .withIndex('by_user_and_recipe', (q) =>
        q.eq('userId', userId).eq('recipeId', recipeId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
