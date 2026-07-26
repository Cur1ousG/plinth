import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeCard } from '@/components/recipe-card';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { dietaryFiltersToParams } from '@/lib/dietaryFilters';
import { useSettings } from '@/providers/settings-provider';
import { searchService } from '@/services/searchService';
import type { RecipeSource } from '@/services/types';

const QUICK_PROMPTS = [
  'Pasta',
  'Chicken',
  'Vegan',
  'Quick dinner',
  'Desserts',
  'Soup',
  'Breakfast',
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function DiscoverScreen() {
  const router = useRouter();
  const { dietary } = useSettings();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeSource[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setStatus('loading');
    setErrorMessage('');
    try {
      const filters = dietaryFiltersToParams(dietary);
      const items = await searchService.search(trimmed, filters);
      setResults(items);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const openRecipe = (source: RecipeSource) => {
    if (!source.id) return;
    router.push({ pathname: '/recipe', params: { id: source.id } });
  };

  const showResults = status !== 'idle' || results.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-5 pb-3 pt-2">
        <Text className="mb-4 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Discover
        </Text>

        <View className="flex-row items-center rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
          <Ionicons name="search" size={20} color="#737373" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search any recipe…"
            placeholderTextColor="#737373"
            className="ml-3 flex-1 text-base text-neutral-900 dark:text-neutral-50"
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setResults([]);
                setStatus('idle');
              }}
              hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#737373" />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="pt-3 pr-2">
          {QUICK_PROMPTS.map((p) => (
            <Pressable
              key={p}
              onPress={() => runSearch(p)}
              className="mr-2 rounded-full border border-neutral-200 bg-white px-4 py-2 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900">
              <Text className="text-sm text-neutral-700 dark:text-neutral-300">{p}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showResults ? (
        <ResultsView
          status={status}
          results={results}
          errorMessage={errorMessage}
          onPick={openRecipe}
          onRetry={() => runSearch(query)}
        />
      ) : (
        <SuggestionsView />
      )}
    </SafeAreaView>
  );
}

function SuggestionsView() {
  const { trending } = useHomeFeed();
  return (
    <ScrollView contentContainerClassName="px-5 pb-10">
      <Text className="mb-3 mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Popular this week
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="pr-2">
        {trending.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </ScrollView>

      <Text className="mb-3 mt-6 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Tip
      </Text>
      <View className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          Search hundreds of thousands of recipes. Tap any result to see ingredients, nutrition,
          and cook it from the original site without leaving the app.
        </Text>
      </View>
    </ScrollView>
  );
}

function ResultsView({
  status,
  results,
  errorMessage,
  onPick,
  onRetry,
}: {
  status: Status;
  results: RecipeSource[];
  errorMessage: string;
  onPick: (r: RecipeSource) => void;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="warning-outline" size={36} color="#ef4444" />
        <Text className="mt-3 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Search failed
        </Text>
        <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {errorMessage || 'Something went wrong. Try again in a moment.'}
        </Text>
        <Pressable
          onPress={onRetry}
          className="mt-4 rounded-xl bg-brand-500 px-5 py-2 active:opacity-80">
          <Text className="text-sm font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'success' && results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="search-outline" size={36} color="#a3a3a3" />
        <Text className="mt-3 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          No results
        </Text>
        <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Try a simpler term or different cuisine.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id ?? item.url ?? item.title}
      contentContainerClassName="px-5 pb-10 pt-2"
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPick(item)}
          className="flex-row overflow-hidden rounded-2xl border border-neutral-200 bg-white active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="h-24 w-24 bg-neutral-200 dark:bg-neutral-800">
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={{ height: '100%', width: '100%' }}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View className="flex-1 justify-center p-3">
            <Text
              numberOfLines={2}
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {item.siteName}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
