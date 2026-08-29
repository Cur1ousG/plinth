import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/auth-gate';
import { api } from '@/convex/_generated/api';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { convex } from '@/lib/convex';
import { dietaryFiltersToParams } from '@/lib/dietaryFilters';
import { useSettings } from '@/providers/settings-provider';
import type { Recipe } from '@/services/types';

export default function CuisineScreen() {
  return (
    <AuthGate>
      <CuisineInner />
    </AuthGate>
  );
}

function CuisineInner() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const cuisine = typeof name === 'string' ? name : '';
  const { hasPremium } = useEntitlement();
  const { isSaved, toggle } = useSavedRecipes();
  const { dietary, intolerances, excludedIngredients } = useSettings();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasPremium || !cuisine) return;
    let active = true;
    setLoading(true);
    setError('');
    const filters = dietaryFiltersToParams(dietary, intolerances, excludedIngredients);
    convex
      .action(api.spoonacular.byCuisine, {
        cuisine,
        number: 16,
        diet: filters.diet,
        intolerances: filters.intolerances,
        excludeIngredients: filters.excludeIngredients,
      })
      .then((data) => {
        if (active) setRecipes(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cuisine, hasPremium, dietary, intolerances, excludedIngredients]);

  if (!hasPremium) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8 dark:bg-charcoal">
        <Stack.Screen options={{ title: cuisine }} />
        <Ionicons name="lock-closed" size={36} color="#a8a29e" />
        <Text className="mt-3 text-base font-semibold text-stone-900 dark:text-stone-50">
          Premium required
        </Text>
        <Text className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">
          Browsing by cuisine is part of Plinth Premium.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream dark:bg-charcoal">
        <Stack.Screen options={{ title: cuisine }} />
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8 dark:bg-charcoal">
        <Stack.Screen options={{ title: cuisine }} />
        <Text className="text-center text-sm text-stone-500">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-cream dark:bg-charcoal">
      <Stack.Screen options={{ title: cuisine }} />
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        numColumns={2}
        contentContainerClassName="p-3"
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/recipe', params: { id: item.id } })}
            className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-white active:opacity-80 dark:border-stone-800 dark:bg-stone-900">
            <View className="relative h-32 w-full bg-stone-200 dark:bg-stone-800">
              {item.thumbnail ? (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={{ height: '100%', width: '100%' }}
                  contentFit="cover"
                />
              ) : null}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  void toggle(item);
                }}
                hitSlop={8}
                className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50">
                <Ionicons
                  name={isSaved(item.id) ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isSaved(item.id) ? '#f97316' : '#ffffff'}
                />
              </Pressable>
            </View>
            <View className="p-3">
              <Text
                numberOfLines={2}
                className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                {item.title}
              </Text>
              {item.minutes != null && (
                <View className="mt-1 flex-row items-center">
                  <Ionicons name="time-outline" size={12} color="#78716c" />
                  <Text className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {item.minutes} min
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
