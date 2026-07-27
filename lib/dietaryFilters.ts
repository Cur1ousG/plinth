import type { DietaryPreference, Intolerance } from '@/providers/settings-provider';

export type RecipeFilters = {
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
};

/**
 * Translate the user's saved food preferences into Spoonacular query params.
 *
 * - `diet` — one eating pattern. Spoonacular ANDs multiple diets, which quickly
 *   returns nothing, so we send the strictest selected one only.
 * - `intolerances` — comma-separated allergens; Spoonacular excludes any recipe
 *   containing them. This is the right mechanism for celiac, lactose, nut
 *   allergies etc., because it's an exclusion rather than a preference.
 * - `excludeIngredients` — comma-separated free-text the user typed in.
 *
 * Reference: https://spoonacular.com/food-api/docs#Diets and #Intolerances
 */
export function dietaryFiltersToParams(
  prefs: DietaryPreference[],
  intolerances: Intolerance[] = [],
  excludedIngredients: string[] = [],
): RecipeFilters {
  // Strictest first — if someone ticks both vegan and vegetarian, vegan wins.
  const dietRanking: { id: DietaryPreference; spoonacular: string }[] = [
    { id: 'vegan', spoonacular: 'vegan' },
    { id: 'vegetarian', spoonacular: 'vegetarian' },
    { id: 'pescetarian', spoonacular: 'pescetarian' },
    { id: 'whole30', spoonacular: 'whole30' },
    { id: 'paleo', spoonacular: 'paleo' },
    { id: 'ketogenic', spoonacular: 'ketogenic' },
  ];
  const diet = dietRanking.find((d) => prefs.includes(d.id))?.spoonacular;

  // Fold legacy dietary ids in, in case a caller passes un-migrated prefs.
  const allIntolerances = new Set<string>(intolerances);
  if (prefs.includes('glutenFree')) allIntolerances.add('gluten');
  if (prefs.includes('dairyFree')) allIntolerances.add('dairy');

  const excluded = excludedIngredients
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return {
    diet,
    intolerances: allIntolerances.size > 0 ? [...allIntolerances].join(',') : undefined,
    excludeIngredients: excluded.length > 0 ? excluded.join(',') : undefined,
  };
}
