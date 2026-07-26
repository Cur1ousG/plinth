import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AuthGate } from '@/components/auth-gate';
import { useCart } from '@/hooks/useCart';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { recipeService } from '@/services/recipeService';
import type { ParsedRecipe } from '@/services/types';

type Tab = 'ingredients' | 'instructions';

export default function RecipeScreen() {
  return (
    <AuthGate>
      <RecipeScreenInner />
    </AuthGate>
  );
}

function RecipeScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const { isSaved, toggle } = useSavedRecipes();
  const { addIngredients } = useCart();

  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('Missing recipe id');
      setLoading(false);
      return;
    }
    setLoading(true);
    recipeService
      .getById(id)
      .then((r) => {
        if (!active) return;
        setRecipe(r);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const onAddToCart = async () => {
    if (!recipe) return;
    const selected = recipe.ingredients.filter((_, i) => checkedIngredients[i]);
    const list = selected.length > 0 ? selected : recipe.ingredients;
    if (list.length === 0) return;
    await addIngredients(list, recipe.id);
    Alert.alert(
      'Added to shopping cart',
      `${list.length} item${list.length === 1 ? '' : 's'} added.`,
    );
  };

  const onShareExternal = async () => {
    if (!recipe?.url) return;
    try {
      await WebBrowser.openBrowserAsync(recipe.url);
    } catch (err) {
      Alert.alert('Could not open', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Recipe' }} />
        <Ionicons name="warning-outline" size={36} color="#ef4444" />
        <Text className="mt-3 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load recipe
        </Text>
        <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {error || 'Try again from Discover.'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-brand-500 px-5 py-2 active:opacity-80">
          <Text className="text-sm font-semibold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const saved = isSaved(recipe.id);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center border-b border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-2">
          <Ionicons name="chevron-back" size={24} color="#737373" />
        </Pressable>
        <View className="ml-1 flex-1">
          <Text
            numberOfLines={1}
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {recipe.title}
          </Text>
          {recipe.siteName ? (
            <Text numberOfLines={1} className="text-xs text-neutral-500 dark:text-neutral-400">
              {recipe.siteName}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => toggle(recipe)}
          hitSlop={8}
          className="p-2"
          accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={22}
            color={saved ? '#f97316' : '#737373'}
          />
        </Pressable>
        {recipe.url ? (
          <Pressable
            onPress={onShareExternal}
            hitSlop={8}
            className="p-2"
            accessibilityLabel="Open in external browser">
            <Ionicons name="open-outline" size={22} color="#737373" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row border-b border-neutral-200 dark:border-neutral-800">
        <TabButton label="Ingredients" active={tab === 'ingredients'} onPress={() => setTab('ingredients')} />
        <TabButton label="Instructions" active={tab === 'instructions'} onPress={() => setTab('instructions')} />
      </View>

      {tab === 'ingredients' ? (
        <IngredientsTab
          recipe={recipe}
          checked={checkedIngredients}
          onToggleCheck={(i) =>
            setCheckedIngredients((prev) => ({ ...prev, [i]: !prev[i] }))
          }
          onAddToCart={onAddToCart}
        />
      ) : (
        <InstructionsTab recipe={recipe} />
      )}
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center py-3 ${
        active ? 'border-b-2 border-brand-500' : ''
      }`}>
      <Text
        className={`text-sm font-semibold ${
          active
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-neutral-500 dark:text-neutral-400'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

function IngredientsTab({
  recipe,
  checked,
  onToggleCheck,
  onAddToCart,
}: {
  recipe: ParsedRecipe;
  checked: Record<number, boolean>;
  onToggleCheck: (i: number) => void;
  onAddToCart: () => void;
}) {
  const calories = recipe.nutrients?.find((n) => n.name === 'Calories');

  return (
    <View className="flex-1">
      <FlatList
        data={recipe.ingredients}
        keyExtractor={(_, i) => `ing-${i}`}
        ListHeaderComponent={
          <View className="px-5 pb-2 pt-4">
            {recipe.thumbnail ? (
              <Image
                source={{ uri: recipe.thumbnail }}
                style={{ height: 180, width: '100%', borderRadius: 16 }}
                contentFit="cover"
                transition={200}
              />
            ) : null}
            <View className="mt-3 flex-row flex-wrap">
              {recipe.totalTime ? (
                <Pill icon="time-outline" label={recipe.totalTime} />
              ) : null}
              {recipe.yields ? <Pill icon="people-outline" label={recipe.yields} /> : null}
              {calories ? (
                <Pill
                  icon="flame-outline"
                  label={`${Math.round(calories.amount)} ${calories.unit}`}
                />
              ) : null}
            </View>
            <Text className="mt-5 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Ingredients
            </Text>
            <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Tap to check off, then add to your shopping cart.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onToggleCheck(index)}
            className="mx-5 my-1 flex-row items-center rounded-xl px-3 py-3 active:bg-neutral-100 dark:active:bg-neutral-900">
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${
                checked[index]
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}>
              {checked[index] && <Ionicons name="checkmark" size={14} color="#ffffff" />}
            </View>
            <Text
              className={`flex-1 text-sm ${
                checked[index]
                  ? 'text-neutral-400 line-through dark:text-neutral-600'
                  : 'text-neutral-900 dark:text-neutral-50'
              }`}>
              {item.original}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center px-8 py-12">
            <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              No structured ingredients available for this recipe.
            </Text>
          </View>
        }
        contentContainerClassName="pb-28"
      />

      {recipe.ingredients.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
          <Pressable
            onPress={onAddToCart}
            className="items-center rounded-2xl bg-brand-500 px-5 py-3 active:opacity-80">
            <Text className="text-base font-semibold text-white">
              Add to shopping cart
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function InstructionsTab({ recipe }: { recipe: ParsedRecipe }) {
  if (!recipe.url) {
    return (
      <ScrollView className="flex-1" contentContainerClassName="p-5">
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          {recipe.instructions ?? 'No instructions available.'}
        </Text>
      </ScrollView>
    );
  }
  return (
    <WebView
      source={{ uri: recipe.url }}
      startInLoadingState
      renderLoading={() => (
        <View className="absolute inset-0 items-center justify-center bg-white dark:bg-neutral-950">
          <ActivityIndicator color="#f97316" />
        </View>
      )}
      sharedCookiesEnabled
      allowsBackForwardNavigationGestures
    />
  );
}

function Pill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="mr-2 mt-2 flex-row items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 dark:border-neutral-800 dark:bg-neutral-900">
      <Ionicons name={icon} size={14} color="#737373" />
      <Text className="ml-1 text-xs text-neutral-600 dark:text-neutral-400">{label}</Text>
    </View>
  );
}
