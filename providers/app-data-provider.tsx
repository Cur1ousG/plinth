import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { recipeService } from '@/services/recipeService';
import type {
  CartItem,
  Ingredient,
  ParsedRecipe,
  Recipe,
  SavedRecipe,
} from '@/services/types';

type SavedRecipesContextValue = {
  items: SavedRecipe[];
  ready: boolean;
  isSaved: (id: string) => boolean;
  save: (recipe: Recipe | ParsedRecipe) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (recipe: Recipe | ParsedRecipe) => Promise<void>;
};

export type ShoppingList = {
  id: Id<'shoppingLists'>;
  name: string;
  role: string;
  memberCount: number;
  isOwner: boolean;
};

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  /** Every list this person belongs to: their own, plus any they've joined. */
  lists: ShoppingList[];
  activeList: ShoppingList | null;
  setActiveList: (id: Id<'shoppingLists'>) => void;
  createInvite: () => Promise<{ code: string; expiresAt: number } | null>;
  joinByCode: (code: string) => Promise<void>;
  leaveActiveList: () => Promise<void>;
  renameActiveList: (name: string) => Promise<void>;
  addItem: (input: { name: string; quantity?: string; fromRecipeId?: string }) => Promise<void>;
  addIngredients: (ings: Ingredient[], fromRecipeId?: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearChecked: () => Promise<void>;
};

const SavedRecipesContext = createContext<SavedRecipesContextValue | null>(null);
const CartContext = createContext<CartContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser();

  const savedDocs = useQuery(api.savedRecipes.list, isSignedIn ? {} : 'skip');
  const saveRecipe = useMutation(api.savedRecipes.save);
  const removeRecipe = useMutation(api.savedRecipes.remove);

  // Which list the cart screen shows. Everyone starts on the first list they
  // belong to — their own — and switches deliberately. Joining a household list
  // switches to it, because that's what someone who just typed a code wants.
  const listDocs = useQuery(api.shoppingLists.myLists, isSignedIn ? {} : 'skip');
  const ensureList = useMutation(api.shoppingLists.ensureList);
  const createInviteMut = useMutation(api.shoppingLists.createInvite);
  const joinByCodeMut = useMutation(api.shoppingLists.joinByCode);
  const leaveMut = useMutation(api.shoppingLists.leave);
  const renameMut = useMutation(api.shoppingLists.rename);
  const [chosenListId, setChosenListId] = useState<Id<'shoppingLists'> | null>(null);

  const lists: ShoppingList[] = useMemo(() => listDocs ?? [], [listDocs]);
  const activeList =
    lists.find((l) => l.id === chosenListId) ?? lists[0] ?? null;
  const activeListId = activeList?.id;

  // A query can't create rows, so the personal list (and the adoption of any
  // cart items from before lists existed) happens here, once, on first sign-in.
  useEffect(() => {
    if (isSignedIn && listDocs !== undefined && listDocs.length === 0) {
      void ensureList({}).catch(() => {});
    }
  }, [isSignedIn, listDocs, ensureList]);

  const cartDocs = useQuery(
    api.cart.list,
    isSignedIn ? (activeListId ? { listId: activeListId } : {}) : 'skip',
  );
  const addCartMany = useMutation(api.cart.addMany);
  const addCart = useMutation(api.cart.add);
  const toggleCart = useMutation(api.cart.toggle);
  const removeCart = useMutation(api.cart.remove);
  const clearCheckedCart = useMutation(api.cart.clearChecked);

  const savedItems: SavedRecipe[] = useMemo(
    () =>
      (savedDocs ?? []).map((d) => ({
        id: d.recipeId,
        title: d.title,
        url: d.url,
        thumbnail: d.thumbnail,
        siteName: d.siteName,
        ingredients: d.ingredients,
        instructions: d.instructions,
        totalTime: d.totalTime,
        yields: d.yields,
        nutrients: d.nutrients,
        savedAt: d.savedAt,
      })),
    [savedDocs],
  );

  const cartItems: CartItem[] = useMemo(
    () =>
      (cartDocs ?? []).map((d) => ({
        id: d._id,
        name: d.name,
        quantity: d.quantity,
        checked: d.checked,
        fromRecipeId: d.fromRecipeId,
      })),
    [cartDocs],
  );

  const savedValue = useMemo<SavedRecipesContextValue>(() => {
    const isSaved = (id: string) => savedItems.some((r) => r.id === id);
    const writeSaved = (r: Recipe | ParsedRecipe) =>
      saveRecipe({
        recipeId: r.id,
        title: r.title,
        url: r.url,
        thumbnail: r.thumbnail,
        siteName: r.siteName,
        ingredients: 'ingredients' in r && Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: 'instructions' in r ? r.instructions : undefined,
        totalTime: 'totalTime' in r ? r.totalTime : undefined,
        yields: 'yields' in r ? r.yields : undefined,
        nutrients: 'nutrients' in r ? r.nutrients : undefined,
      });

    /**
     * Hearting a recipe from a rail or a search result only has the card to go
     * on — title, image, url, no ingredients. Left like that, the recipe isn't
     * readable until someone opens it, which needs Spoonacular to be reachable
     * and under quota at that moment. Saving it properly now means everything
     * in Your Recipes stays readable offline and forever.
     *
     * The thin record is written first so the heart fills instantly; the detail
     * lands a moment later. If the fetch fails — offline, over quota — the
     * recipe is still saved, just thin, and opening it will complete it later.
     */
    const save = async (r: Recipe | ParsedRecipe) => {
      const hasIngredients =
        'ingredients' in r && Array.isArray(r.ingredients) && r.ingredients.length > 0;

      await writeSaved(r);
      if (hasIngredients || r.id.startsWith('import:')) return;

      try {
        const full = await recipeService.getById(r.id);
        if (full.ingredients.length > 0) await writeSaved(full);
      } catch {
        // Keep the thin record. app/recipe.tsx completes it on first open.
      }
    };
    const remove = async (recipeId: string) => {
      await removeRecipe({ recipeId });
    };
    const toggle = async (r: Recipe | ParsedRecipe) => {
      if (isSaved(r.id)) await remove(r.id);
      else await save(r);
    };
    return {
      items: savedItems,
      ready: savedDocs !== undefined,
      isSaved,
      save,
      remove,
      toggle,
    };
  }, [savedItems, savedDocs, saveRecipe, removeRecipe]);

  const cartValue = useMemo<CartContextValue>(
    () => ({
      items: cartItems,
      ready: cartDocs !== undefined,
      lists,
      activeList,
      setActiveList: (id) => setChosenListId(id),
      createInvite: async () => {
        if (!activeListId) return null;
        return createInviteMut({ listId: activeListId });
      },
      joinByCode: async (code) => {
        const joined = await joinByCodeMut({ code });
        setChosenListId(joined);
      },
      leaveActiveList: async () => {
        if (!activeListId) return;
        await leaveMut({ listId: activeListId });
        setChosenListId(null);
      },
      renameActiveList: async (name) => {
        if (!activeListId) return;
        await renameMut({ listId: activeListId, name });
      },
      addItem: async (input) => {
        await addCart({ ...input, listId: activeListId });
      },
      addIngredients: async (ings, fromRecipeId) => {
        const items = ings.map((ing) => ({
          name: ing.original,
          quantity: ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : undefined,
          fromRecipeId,
        }));
        if (items.length === 0) return;
        await addCartMany({ items, listId: activeListId });
      },
      toggle: async (id: string) => {
        await toggleCart({ id: id as Id<'cartItems'> });
      },
      remove: async (id: string) => {
        await removeCart({ id: id as Id<'cartItems'> });
      },
      clearChecked: async () => {
        await clearCheckedCart({ listId: activeListId });
      },
    }),
    [
      cartItems, cartDocs, lists, activeList, activeListId,
      createInviteMut, joinByCodeMut, leaveMut, renameMut,
      addCart, addCartMany, toggleCart, removeCart, clearCheckedCart,
    ],
  );

  return (
    <SavedRecipesContext.Provider value={savedValue}>
      <CartContext.Provider value={cartValue}>{children}</CartContext.Provider>
    </SavedRecipesContext.Provider>
  );
}

export function useSavedRecipes() {
  const ctx = useContext(SavedRecipesContext);
  if (!ctx) throw new Error('useSavedRecipes must be used inside AppDataProvider');
  return ctx;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside AppDataProvider');
  return ctx;
}
