import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import type { Recipe } from '@/services/types';

type Variant = 'wide' | 'compact';

/**
 * The photograph is the card.
 *
 * This used to be a bordered box with the image sitting inside it, which made
 * every rail read as a list of form controls. Dropping the border and the card
 * fill lets the food meet the canvas directly, and moves the metadata onto the
 * image as pills — the pattern every recipe app worth copying uses, because it
 * buys back the vertical space that a metadata row underneath would cost.
 */
export function RecipeCard({
  recipe,
  variant = 'wide',
  onPress,
}: {
  recipe: Recipe;
  variant?: Variant;
  onPress?: () => void;
}) {
  const router = useRouter();
  const handlePress =
    onPress ?? (() => router.push({ pathname: '/recipe', params: { id: recipe.id } }));
  const { isSaved, toggle } = useSavedRecipes();
  const saved = isSaved(recipe.id);

  const containerWidth = variant === 'compact' ? 'w-44' : 'w-64';
  const imageHeight = variant === 'compact' ? 'h-32' : 'h-40';

  return (
    <Pressable onPress={handlePress} className={`mr-3 ${containerWidth} active:opacity-80`}>
      <View
        className={`relative ${imageHeight} w-full overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-800`}>
        {recipe.thumbnail ? (
          <Image
            source={{ uri: recipe.thumbnail }}
            style={{ height: '100%', width: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        {/* Cream rather than a dark scrim: it reads at a glance against the
            browns and reds that dominate food photography, where a translucent
            black pill tends to disappear. */}
        {recipe.minutes != null && (
          <View className="absolute left-2 top-2 rounded-full bg-cream/95 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-stone-900">{recipe.minutes} min</Text>
          </View>
        )}

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            void toggle(recipe);
          }}
          hitSlop={8}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50">
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? '#fb923c' : '#ffffff'}
          />
        </Pressable>
      </View>

      <Text
        numberOfLines={2}
        className="mt-2 text-[15px] font-semibold leading-5 text-stone-900 dark:text-stone-50">
        {recipe.title}
      </Text>
      {recipe.cuisine ? (
        <Text className="mt-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
          {recipe.cuisine}
        </Text>
      ) : null}
    </Pressable>
  );
}
