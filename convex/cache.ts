import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';

/**
 * Internal-only accessors for the shared Spoonacular cache.
 *
 * These are `internal*` on purpose: clients must go through the public actions in
 * spoonacular.ts, which enforce auth and decide when to refetch upstream. Nothing
 * here is reachable from the app directly.
 */

const recipeCardShape = v.object({
  id: v.string(),
  title: v.string(),
  thumbnail: v.optional(v.string()),
  minutes: v.optional(v.number()),
  cuisine: v.optional(v.string()),
  url: v.optional(v.string()),
  siteName: v.optional(v.string()),
});

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

// ---------------------------------------------------------------------------
// Feeds (home rails, cuisine grids, macro lookups, dish of the day)
// ---------------------------------------------------------------------------

export const getFeed = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return ctx.db
      .query('cachedFeeds')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
  },
});

export const setFeed = internalMutation({
  args: { key: v.string(), recipes: v.array(recipeCardShape) },
  handler: async (ctx, { key, recipes }) => {
    const existing = await ctx.db
      .query('cachedFeeds')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    const data = { key, recipes, fetchedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, data);
      return;
    }
    await ctx.db.insert('cachedFeeds', data);
  },
});

// ---------------------------------------------------------------------------
// Recipe detail
// ---------------------------------------------------------------------------

export const getRecipe = internalQuery({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    return ctx.db
      .query('cachedRecipes')
      .withIndex('by_recipe', (q) => q.eq('recipeId', recipeId))
      .first();
  },
});

export const setRecipe = internalMutation({
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
    const existing = await ctx.db
      .query('cachedRecipes')
      .withIndex('by_recipe', (q) => q.eq('recipeId', args.recipeId))
      .first();
    const data = { ...args, fetchedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, data);
      return;
    }
    await ctx.db.insert('cachedRecipes', data);
  },
});

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

export const getSearch = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return ctx.db
      .query('cachedSearches')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
  },
});

export const setSearch = internalMutation({
  args: { key: v.string(), results: v.array(recipeCardShape) },
  handler: async (ctx, { key, results }) => {
    const existing = await ctx.db
      .query('cachedSearches')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    const data = { key, results, fetchedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, data);
      return;
    }
    await ctx.db.insert('cachedSearches', data);
  },
});

// ---------------------------------------------------------------------------
// Maintenance — drop stale search rows so the table doesn't grow forever.
// Recipes and feeds are bounded (feeds by filter combos, recipes by catalog size),
// but searches are user-driven and unbounded.
// ---------------------------------------------------------------------------

export const pruneStaleSearches = internalMutation({
  args: { olderThanMs: v.number() },
  handler: async (ctx, { olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;
    // Indexed range scan — only reads rows that are actually expired, so this
    // stays cheap no matter how large the search cache grows.
    const stale = await ctx.db
      .query('cachedSearches')
      .withIndex('by_fetched', (q) => q.lt('fetchedAt', cutoff))
      .collect();
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return stale.length;
  },
});
