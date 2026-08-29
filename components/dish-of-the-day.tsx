import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { useEntitlement } from '@/hooks/useEntitlement';
import { convex } from '@/lib/convex';
import type { Recipe } from '@/services/types';

export function DishOfTheDay() {
  const router = useRouter();
  const { hasPremium, ready } = useEntitlement();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  // The daily pick is cached server-side in Convex and keyed by date, so this is
  // a cheap read and every user sees the same dish.
  const load = useCallback(async () => {
    try {
      const fresh = await convex.action(api.spoonacular.dishOfTheDay, {});
      if (fresh) setRecipe(fresh);
    } catch {
      // ignore — UI shows nothing rather than an error for this optional card
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPremium) void load();
    else setLoading(false);
  }, [hasPremium, load]);

  if (!ready) return null;

  if (!hasPremium) {
    return (
      <Link href="/premium" asChild>
        <Pressable className="mb-6 flex-row items-center rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 bg-brand-500 p-4 active:opacity-80">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="sparkles" size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-white">Dish for the day</Text>
            <Text className="mt-0.5 text-xs text-brand-100">
              Premium auto-picks a recipe for you each day
            </Text>
          </View>
          <Ionicons name="lock-closed" size={18} color="#ffffff" />
        </Pressable>
      </Link>
    );
  }

  if (loading) {
    return (
      <View className="mb-6 h-44 items-center justify-center rounded-2xl border border-stone-200 dark:border-stone-800">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe', params: { id: recipe.id } })}
      className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white active:opacity-80 dark:border-stone-800 dark:bg-stone-900">
      <View className="h-44 w-full bg-stone-200 dark:bg-stone-800">
        {recipe.thumbnail ? (
          <Image
            source={{ uri: recipe.thumbnail }}
            style={{ height: '100%', width: '100%' }}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View className="p-4">
        <View className="flex-row items-center">
          <Ionicons name="sparkles" size={14} color="#ea580c" />
          <Text className="ml-1 text-xs uppercase tracking-wider text-brand-600">
            Today&apos;s pick
          </Text>
        </View>
        <Text
          numberOfLines={2}
          className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">
          {recipe.title}
        </Text>
        {recipe.minutes != null && (
          <View className="mt-1 flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#78716c" />
            <Text className="ml-1 text-xs text-stone-500 dark:text-stone-400">
              {recipe.minutes} min
              {recipe.cuisine ? ` · ${recipe.cuisine}` : ''}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
