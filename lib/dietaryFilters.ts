import type { DietaryPreference } from '@/providers/settings-provider';

/**
 * Map our DietaryPreference set to Spoonacular's `diet` and `intolerances` query params.
 * - `diet` is an OR of dietary patterns (vegetarian, vegan, etc.) — pass at most one.
 * - `intolerances` is a comma-separated list of allergens to exclude.
 *
 * Reference: https://spoonacular.com/food-api/docs#Diets and #Intolerances
 */
export function dietaryFiltersToParams(prefs: DietaryPreference[]): {
  diet?: string;
  intolerances?: string;
} {
  // Pick the first matching diet (Spoonacular accepts comma-separated OR; we keep it simple).
  // Order matters: prefer the strictest dietary pattern when multiple are checked.
  const dietRanking: { id: DietaryPreference; spoonacular: string }[] = [
    { id: 'vegan', spoonacular: 'vegan' },
    { id: 'vegetarian', spoonacular: 'vegetarian' },
    { id: 'pescetarian', spoonacular: 'pescetarian' },
    { id: 'ketogenic', spoonacular: 'ketogenic' },
  ];
  const diet = dietRanking.find((d) => prefs.includes(d.id))?.spoonacular;

  const intolerances: string[] = [];
  if (prefs.includes('glutenFree')) intolerances.push('gluten');
  if (prefs.includes('dairyFree')) intolerances.push('dairy');

  return {
    diet,
    intolerances: intolerances.length > 0 ? intolerances.join(',') : undefined,
  };
}
