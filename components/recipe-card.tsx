import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import type { Recipe } from '@/services/types';

type Variant = 'wide' | 'compact';

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
    <Pressable
      onPress={handlePress}
      className={`mr-3 ${containerWidth} overflow-hidden rounded-2xl border border-neutral-200 bg-white active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900`}>
      <View className={`relative ${imageHeight} w-full bg-neutral-200 dark:bg-neutral-800`}>
        {recipe.thumbnail ? (
          <Image
            source={{ uri: recipe.thumbnail }}
            style={{ height: '100%', width: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
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
            color={saved ? '#f97316' : '#ffffff'}
          />
        </Pressable>
      </View>
      <View className="p-3">
        <Text
          numberOfLines={2}
          className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {recipe.title}
        </Text>
        <View className="mt-1 flex-row items-center">
          {recipe.minutes != null && (
            <View className="mr-2 flex-row items-center">
              <Ionicons name="time-outline" size={12} color="#737373" />
              <Text className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
                {recipe.minutes} min
              </Text>
            </View>
          )}
          {recipe.cuisine && (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{recipe.cuisine}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
