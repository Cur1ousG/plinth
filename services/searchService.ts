import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';

import type { RecipeSource } from './types';

export type SearchFilters = {
  diet?: string;
  intolerances?: string;
};

export interface SearchService {
  search(query: string, filters?: SearchFilters): Promise<RecipeSource[]>;
}

class ConvexSearchService implements SearchService {
  async search(query: string, filters?: SearchFilters): Promise<RecipeSource[]> {
    return convex.action(api.spoonacular.search, {
      query,
      diet: filters?.diet,
      intolerances: filters?.intolerances,
    });
  }
}

export const searchService: SearchService = new ConvexSearchService();
