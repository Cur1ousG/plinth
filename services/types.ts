export type RecipeSource = {
  id?: string;
  url?: string;
  title: string;
  thumbnail?: string;
  siteName?: string;
};

export type Recipe = {
  id: string;
  title: string;
  thumbnail?: string;
  url?: string;
  siteName?: string;
  minutes?: number;
  cuisine?: string;
};

export type Ingredient = {
  name?: string;
  amount?: number;
  unit?: string;
  original: string;
};

export type Nutrient = {
  name: string;
  amount: number;
  unit: string;
};

export type ParsedRecipe = {
  id: string;
  url?: string;
  title: string;
  thumbnail?: string;
  siteName?: string;
  ingredients: Ingredient[];
  instructions?: string;
  totalTime?: string;
  yields?: string;
  nutrients?: Nutrient[];
};

export type SavedRecipe = ParsedRecipe & {
  savedAt: number;
  notes?: string;
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'dessert';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'dessert'];

export type CalendarEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId?: string;
  recipeTitle: string;
  recipeThumbnail?: string;
};

export function calendarEntryId(date: string, slot: MealSlot): string {
  return `${date}_${slot}`;
}

export type CartItem = {
  id: string;
  name: string;
  quantity?: string;
  checked: boolean;
  fromRecipeId?: string;
};
