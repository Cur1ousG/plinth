import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';
import type { RecipeFilters } from '@/lib/dietaryFilters';

import type { RecipeSource } from './types';

export type SearchFilters = RecipeFilters;

export interface SearchService {
  search(query: string, filters?: SearchFilters): Promise<RecipeSource[]>;
}

class ConvexSearchService implements SearchService {
  async search(query: string, filters?: SearchFilters): Promise<RecipeSource[]> {
    return convex.action(api.spoonacular.search, {
      query,
      diet: filters?.diet,
      intolerances: filters?.intolerances,
      excludeIngredients: filters?.excludeIngredients,
    });
  }
}

export const searchService: SearchService = new ConvexSearchService();
