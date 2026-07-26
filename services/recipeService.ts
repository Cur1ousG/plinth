import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';

import type { ParsedRecipe } from './types';

export interface RecipeService {
  getById(id: string): Promise<ParsedRecipe>;
}

class ConvexRecipeService implements RecipeService {
  async getById(id: string): Promise<ParsedRecipe> {
    return convex.action(api.spoonacular.getRecipe, { id });
  }
}

export const recipeService: RecipeService = new ConvexRecipeService();
