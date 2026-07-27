'use node';

import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalAction, type ActionCtx } from './_generated/server';

const BASE = 'https://api.spoonacular.com';

// Cache lifetimes. Recipes are effectively immutable so they get a long TTL;
// rails refresh daily (a cron pre-warms them); searches are cheap to recompute.
const DAY_MS = 24 * 60 * 60 * 1000;
const FEED_TTL_MS = DAY_MS;
const RECIPE_TTL_MS = 30 * DAY_MS;
const SEARCH_TTL_MS = 7 * DAY_MS;

async function requireAuth(ctx: ActionCtx) {
  const id = await ctx.auth.getUserIdentity();
  if (!id) throw new Error('Not authenticated');
}

function apiKey(): string {
  const k = process.env.SPOONACULAR_API_KEY;
  if (!k) throw new Error('SPOONACULAR_API_KEY not configured in Convex environment');
  return k;
}

async function fetchJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v2] of Object.entries(params)) url.searchParams.set(k, v2);
  url.searchParams.set('apiKey', apiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Spoonacular ${path} failed: ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`,
    );
  }
  return res.json() as Promise<T>;
}

type SpoonacularSearchResult = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  cuisines?: string[];
  sourceUrl?: string;
};

type SearchResponse = { results: SpoonacularSearchResult[]; totalResults: number };
type RandomResponse = { recipes: SpoonacularSearchResult[] };

type RecipeCard = {
  id: string;
  title: string;
  thumbnail?: string;
  minutes?: number;
  cuisine?: string;
  url?: string;
  siteName?: string;
};

type RecipeIngredient = {
  name?: string;
  amount?: number;
  unit?: string;
  original: string;
};

type RecipeNutrient = { name: string; amount: number; unit: string };

type RecipeDetail = {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  siteName?: string;
  ingredients: RecipeIngredient[];
  instructions?: string;
  totalTime?: string;
  yields?: string;
  nutrients?: RecipeNutrient[];
};

function toRecipeCard(r: SpoonacularSearchResult): RecipeCard {
  return {
    id: String(r.id),
    title: r.title,
    thumbnail: r.image,
    minutes: r.readyInMinutes,
    cuisine: r.cuisines?.[0],
    url: r.sourceUrl,
  };
}

/** Dietary filters applied to a recipe query. */
type Filters = {
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
};

/** Convex arg validators for the filter set — spread into each action's args. */
const filterArgs = {
  diet: v.optional(v.string()),
  intolerances: v.optional(v.string()),
  excludeIngredients: v.optional(v.string()),
};

/**
 * Stable cache-key fragment. Two users with different filters must never share
 * a cache entry — someone with a peanut allergy seeing another user's cached
 * results would be genuinely dangerous.
 */
function filterSig(f: Filters = {}): string {
  return `${f.diet ?? ''}|${f.intolerances ?? ''}|${f.excludeIngredients ?? ''}`;
}

/** Merge filters into a Spoonacular query param bag. */
function applyFilters(params: Record<string, string>, f: Filters): Record<string, string> {
  if (f.diet) params.diet = f.diet;
  if (f.intolerances) params.intolerances = f.intolerances;
  if (f.excludeIngredients) params.excludeIngredients = f.excludeIngredients;
  return params;
}

/** Today's date in UTC, used to key the daily dish. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Cached feed helper — every rail-style lookup goes through this.
// On a hit within TTL we never touch Spoonacular.
// ---------------------------------------------------------------------------

async function cachedFeed(
  ctx: ActionCtx,
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<RecipeCard[]>,
): Promise<RecipeCard[]> {
  const hit = await ctx.runQuery(internal.cache.getFeed, { key: cacheKey });
  if (hit && Date.now() - hit.fetchedAt < ttlMs) {
    return hit.recipes;
  }

  try {
    const recipes = await fetcher();
    await ctx.runMutation(internal.cache.setFeed, { key: cacheKey, recipes });
    return recipes;
  } catch (err) {
    // If the upstream call fails (quota, outage), serve stale data rather than
    // showing the user an error. Only surface the error when we have nothing.
    if (hit) return hit.recipes;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Fetchers — raw upstream calls, no auth, no caching. Reused by both the public
// actions and the cron that pre-warms the cache.
// ---------------------------------------------------------------------------

function fetchTrending() {
  return fetchJson<RandomResponse>('/recipes/random', { number: '6' }).then((d) =>
    d.recipes.map(toRecipeCard),
  );
}

function fetchQuickWeeknight(f: Filters = {}) {
  const params = applyFilters(
    {
      maxReadyTime: '25',
      number: '10',
      sort: 'popularity',
      addRecipeInformation: 'true',
    },
    f,
  );
  return fetchJson<SearchResponse>('/recipes/complexSearch', params).then((d) =>
    d.results.map(toRecipeCard),
  );
}

function fetchWeekendProjects(f: Filters = {}) {
  const params = applyFilters(
    {
      minReadyTime: '60',
      number: '8',
      sort: 'popularity',
      addRecipeInformation: 'true',
    },
    f,
  );
  return fetchJson<SearchResponse>('/recipes/complexSearch', params).then((d) =>
    d.results.map(toRecipeCard),
  );
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export const trending = action({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return cachedFeed(ctx, 'rail:trending', FEED_TTL_MS, fetchTrending);
  },
});

export const quickWeeknight = action({
  args: { ...filterArgs },
  handler: async (ctx, filters) => {
    await requireAuth(ctx);
    return cachedFeed(ctx, `rail:quick:${filterSig(filters)}`, FEED_TTL_MS, () =>
      fetchQuickWeeknight(filters),
    );
  },
});

export const weekendProjects = action({
  args: { ...filterArgs },
  handler: async (ctx, filters) => {
    await requireAuth(ctx);
    return cachedFeed(ctx, `rail:weekend:${filterSig(filters)}`, FEED_TTL_MS, () =>
      fetchWeekendProjects(filters),
    );
  },
});

export const byCuisine = action({
  args: {
    cuisine: v.string(),
    number: v.optional(v.number()),
    ...filterArgs,
  },
  handler: async (ctx, { cuisine, number, ...filters }) => {
    await requireAuth(ctx);
    const count = number ?? 12;
    return cachedFeed(
      ctx,
      `cuisine:${cuisine.toLowerCase()}:${count}:${filterSig(filters)}`,
      FEED_TTL_MS,
      () => {
        const params = applyFilters(
          {
            cuisine,
            number: String(count),
            sort: 'popularity',
            addRecipeInformation: 'true',
          },
          filters,
        );
        return fetchJson<SearchResponse>('/recipes/complexSearch', params).then((d) =>
          d.results.map(toRecipeCard),
        );
      },
    );
  },
});

export const byMacros = action({
  args: {
    minProtein: v.optional(v.number()),
    maxCalories: v.optional(v.number()),
    minCalories: v.optional(v.number()),
    number: v.optional(v.number()),
    ...filterArgs,
  },
  handler: async (ctx, { minProtein, maxCalories, minCalories, number, ...filters }) => {
    await requireAuth(ctx);
    const count = number ?? 10;
    // Round macro targets into buckets of 25 so near-identical requests from
    // different users share a cache entry instead of each hitting Spoonacular.
    const bucket = (n?: number) => (n == null ? '' : String(Math.round(n / 25) * 25));
    const cacheKey = `macros:${bucket(minProtein)}:${bucket(maxCalories)}:${bucket(minCalories)}:${count}:${filterSig(filters)}`;

    return cachedFeed(ctx, cacheKey, FEED_TTL_MS, () => {
      const params = applyFilters(
        {
          number: String(count),
          sort: 'popularity',
          addRecipeInformation: 'true',
        },
        filters,
      );
      if (minProtein != null) params.minProtein = String(minProtein);
      if (maxCalories != null) params.maxCalories = String(maxCalories);
      if (minCalories != null) params.minCalories = String(minCalories);
      return fetchJson<SearchResponse>('/recipes/complexSearch', params).then((d) =>
        d.results.map(toRecipeCard),
      );
    });
  },
});

export const dishOfTheDay = action({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    // Keyed by date: everyone sees the same dish today, and it costs one upstream
    // call for the entire userbase.
    const recipes = await cachedFeed(ctx, `dish-of-day:${todayKey()}`, DAY_MS, () =>
      fetchJson<RandomResponse>('/recipes/random', { number: '1' }).then((d) =>
        d.recipes.map(toRecipeCard),
      ),
    );
    return recipes[0] ?? null;
  },
});

export const search = action({
  args: {
    query: v.string(),
    number: v.optional(v.number()),
    ...filterArgs,
  },
  handler: async (ctx, { query, number, ...filters }): Promise<RecipeCard[]> => {
    await requireAuth(ctx);

    const normalized = query.trim().toLowerCase();
    const count = number ?? 20;
    const cacheKey = `q:${normalized}:${count}:${filterSig(filters)}`;

    const hit = await ctx.runQuery(internal.cache.getSearch, { key: cacheKey });
    if (hit && Date.now() - hit.fetchedAt < SEARCH_TTL_MS) {
      return hit.results;
    }

    try {
      const params = applyFilters(
        {
          query: normalized,
          number: String(count),
          addRecipeInformation: 'false',
        },
        filters,
      );

      const data = await fetchJson<SearchResponse>('/recipes/complexSearch', params);
      const results: RecipeCard[] = data.results.map((r) => ({
        id: String(r.id),
        title: r.title,
        thumbnail: r.image,
        siteName: 'Spoonacular',
      }));

      await ctx.runMutation(internal.cache.setSearch, { key: cacheKey, results });
      return results;
    } catch (err) {
      if (hit) return hit.results;
      throw err;
    }
  },
});

export const getRecipe = action({
  args: { id: v.string() },
  handler: async (ctx, { id }): Promise<RecipeDetail> => {
    await requireAuth(ctx);

    const hit = await ctx.runQuery(internal.cache.getRecipe, { recipeId: id });
    if (hit && Date.now() - hit.fetchedAt < RECIPE_TTL_MS) {
      return {
        id: hit.recipeId,
        title: hit.title,
        url: hit.url,
        thumbnail: hit.thumbnail,
        siteName: hit.siteName,
        ingredients: hit.ingredients,
        instructions: hit.instructions,
        totalTime: hit.totalTime,
        yields: hit.yields,
        nutrients: hit.nutrients,
      };
    }

    type Ingredient = {
      nameClean?: string;
      name?: string;
      amount?: number;
      unit?: string;
      original: string;
    };
    type Nutrient = { name: string; amount: number; unit: string };
    type RecipeInfo = {
      id: number;
      title: string;
      image?: string;
      sourceUrl?: string;
      sourceName?: string;
      readyInMinutes?: number;
      servings?: number;
      instructions?: string;
      extendedIngredients?: Ingredient[];
      nutrition?: { nutrients: Nutrient[] };
    };

    try {
      const data = await fetchJson<RecipeInfo>(
        `/recipes/${encodeURIComponent(id)}/information`,
        { includeNutrition: 'true' },
      );

      const allowed = new Set([
        'Calories',
        'Protein',
        'Carbohydrates',
        'Fat',
        'Fiber',
        'Sugar',
        'Sodium',
      ]);

      const parsed = {
        recipeId: String(data.id),
        title: data.title,
        url: data.sourceUrl,
        thumbnail: data.image,
        siteName: data.sourceName,
        ingredients: (data.extendedIngredients ?? []).map((i) => ({
          name: i.nameClean ?? i.name,
          amount: i.amount,
          unit: i.unit,
          original: i.original,
        })),
        instructions: data.instructions,
        totalTime: data.readyInMinutes != null ? `${data.readyInMinutes} min` : undefined,
        yields: data.servings != null ? `${data.servings} servings` : undefined,
        nutrients: data.nutrition?.nutrients
          ?.filter((n) => allowed.has(n.name))
          .map((n) => ({ name: n.name, amount: n.amount, unit: n.unit })),
      };

      await ctx.runMutation(internal.cache.setRecipe, parsed);

      const { recipeId, ...rest } = parsed;
      return { id: recipeId, ...rest };
    } catch (err) {
      if (hit) {
        return {
          id: hit.recipeId,
          title: hit.title,
          url: hit.url,
          thumbnail: hit.thumbnail,
          siteName: hit.siteName,
          ingredients: hit.ingredients,
          instructions: hit.instructions,
          totalTime: hit.totalTime,
          yields: hit.yields,
          nutrients: hit.nutrients,
        };
      }
      throw err;
    }
  },
});

// ---------------------------------------------------------------------------
// Cron target — refreshes the unfiltered rails + today's dish once per day so
// the common path is always a cache hit, even for the first user of the morning.
// ---------------------------------------------------------------------------

export const warmCaches = internalAction({
  args: {},
  handler: async (ctx) => {
    const jobs: { key: string; run: () => Promise<RecipeCard[]> }[] = [
      { key: 'rail:trending', run: fetchTrending },
      { key: `rail:quick:${filterSig()}`, run: () => fetchQuickWeeknight() },
      { key: `rail:weekend:${filterSig()}`, run: () => fetchWeekendProjects() },
      {
        key: `dish-of-day:${todayKey()}`,
        run: () =>
          fetchJson<RandomResponse>('/recipes/random', { number: '1' }).then((d) =>
            d.recipes.map(toRecipeCard),
          ),
      },
    ];

    for (const job of jobs) {
      try {
        const recipes = await job.run();
        await ctx.runMutation(internal.cache.setFeed, { key: job.key, recipes });
      } catch (err) {
        // Keep warming the rest even if one rail fails; stale data stays served.
        console.error(`[warmCaches] ${job.key} failed`, err);
      }
    }

    // Housekeeping: search keys are user-driven and unbounded.
    await ctx.runMutation(internal.cache.pruneStaleSearches, {
      olderThanMs: SEARCH_TTL_MS,
    });
  },
});
