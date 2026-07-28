import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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

// Lightweight recipe used in rails, search results and grids.
const recipeCardShape = v.object({
  id: v.string(),
  title: v.string(),
  thumbnail: v.optional(v.string()),
  minutes: v.optional(v.number()),
  cuisine: v.optional(v.string()),
  url: v.optional(v.string()),
  siteName: v.optional(v.string()),
});

export default defineSchema({
  savedRecipes: defineTable({
    userId: v.string(),
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
    savedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_recipe', ['userId', 'recipeId']),

  calendarEntries: defineTable({
    userId: v.string(),
    entryKey: v.string(),
    date: v.string(),
    slot: v.string(),
    recipeId: v.optional(v.string()),
    recipeTitle: v.string(),
    recipeThumbnail: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_key', ['userId', 'entryKey'])
    .index('by_user_and_date', ['userId', 'date']),

  cartItems: defineTable({
    userId: v.string(),
    name: v.string(),
    quantity: v.optional(v.string()),
    checked: v.boolean(),
    fromRecipeId: v.optional(v.string()),
  }).index('by_user', ['userId']),

  // Fixed-window counters backing the rate limiter. `key` is either
  // "<userId>:<bucket>" for per-user limits or "global:<bucket>:<date>" for the
  // daily spend cap. See convex/rateLimit.ts.
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_window', ['windowStart']),

  subscriptions: defineTable({
    userId: v.string(),
    status: v.string(), // 'active' | 'on_trial' | 'paused' | 'past_due' | 'cancelled' | 'expired'
    plan: v.string(),
    currentPeriodEnd: v.number(), // ms epoch
    lemonSqueezySubscriptionId: v.optional(v.string()),
    lemonSqueezyCustomerId: v.optional(v.string()),
    customerPortalUrl: v.optional(v.string()),
    updatePaymentMethodUrl: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_subscription_id', ['lemonSqueezySubscriptionId']),

  // ---------------------------------------------------------------------------
  // Shared Spoonacular cache. These tables are read by every user, so one upstream
  // fetch serves the whole userbase instead of one fetch per device.
  // ---------------------------------------------------------------------------

  // Home rails + cuisine grids + macro lookups. `key` encodes the rail/filters.
  cachedFeeds: defineTable({
    key: v.string(),
    recipes: v.array(recipeCardShape),
    fetchedAt: v.number(),
  }).index('by_key', ['key']),

  // Full recipe detail keyed by Spoonacular recipe id.
  cachedRecipes: defineTable({
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
    fetchedAt: v.number(),
  }).index('by_recipe', ['recipeId']),

  // Search results keyed by normalized query + dietary filters.
  // `by_fetched` lets the prune cron range-scan only expired rows instead of
  // reading the whole table.
  cachedSearches: defineTable({
    key: v.string(),
    results: v.array(recipeCardShape),
    fetchedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_fetched', ['fetchedAt']),
});
