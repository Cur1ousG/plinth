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

  // Per-account facts that must survive reinstalling the app or signing in on
  // a second phone. Onboarding lived only in AsyncStorage, so an existing
  // account was greeted as brand new on any device it hadn't been through the
  // welcome flow on — including after a password reset.
  userProfiles: defineTable({
    userId: v.string(),
    onboardedAt: v.optional(v.number()),
    // When this account's free trial started. Held server-side so the 21 days
    // are actually enforced — the client's own copy is a display convenience,
    // and anything that trusts it can be edited by the person it limits.
    trialStartedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),

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

  // A shopping list, which one or more people share. Everyone gets a personal
  // one on first use; household sharing is the same object with more members.
  shoppingLists: defineTable({
    name: v.string(),
    ownerId: v.string(),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  // Who may read and write a list. Membership — not ownership of each row — is
  // what every cart function checks, which is the whole point of the change.
  listMembers: defineTable({
    listId: v.id('shoppingLists'),
    userId: v.string(),
    role: v.string(), // 'owner' | 'member'
    joinedAt: v.number(),
  })
    .index('by_list', ['listId'])
    .index('by_user', ['userId'])
    .index('by_list_and_user', ['listId', 'userId']),

  // Short codes someone types to join a household list. They expire, because a
  // join code that works forever is a permanent key to someone's shopping.
  listInvites: defineTable({
    code: v.string(),
    listId: v.id('shoppingLists'),
    createdBy: v.string(),
    expiresAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_list', ['listId']),

  cartItems: defineTable({
    // Who added it. Kept so a shared list can show who put the milk on it —
    // it is no longer what decides who may see or change the row.
    userId: v.string(),
    // Optional only until every existing row has been migrated onto a list.
    listId: v.optional(v.id('shoppingLists')),
    name: v.string(),
    quantity: v.optional(v.string()),
    checked: v.boolean(),
    fromRecipeId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_list', ['listId']),

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
    // Which store took the money. Absent on rows written before Play Billing,
    // which were all Lemon Squeezy.
    provider: v.optional(v.string()), // 'lemonsqueezy' | 'play' | 'appstore'
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
