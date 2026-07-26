import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarCookbook } from '@/components/calendar-cookbook';
import { CuisinesRail } from '@/components/cuisines-rail';
import { DishOfTheDay } from '@/components/dish-of-the-day';
import { RecipeCard } from '@/components/recipe-card';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import type { Recipe } from '@/services/types';

export default function HomeScreen() {
  const { trending, quickWeeknight, weekendProjects, loading, error, refresh } = useHomeFeed();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#f97316" />
        }>
        <View className="mb-6">
          <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {greetingForHour(new Date().getHours())}
          </Text>
          <Text className="mt-1 text-base text-neutral-500 dark:text-neutral-400">
            What are you cooking today?
          </Text>
        </View>

        <Link href={{ pathname: '/your-recipes', params: { from: 'Home' } }} asChild>
          <Pressable className="mb-6 flex-row items-center justify-between rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80">
            <View>
              <Text className="text-base font-semibold text-white">Your Recipes</Text>
              <Text className="text-xs text-brand-100">Saved meals and favorites</Text>
            </View>
            <Text className="text-2xl text-white">→</Text>
          </Pressable>
        </Link>

        <DishOfTheDay />

        <Section title="Browse by cuisine">
          <CuisinesRail />
        </Section>

        <Section title="Calendar cookbook">
          <CalendarCookbook />
        </Section>

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        <Section title="Trending today">
          <Rail recipes={trending} loading={loading} />
        </Section>

        <Section title="Quick weeknight meals">
          <Rail recipes={quickWeeknight} loading={loading} compact />
        </Section>

        <Section title="Weekend projects">
          <Rail recipes={weekendProjects} loading={loading} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Rail({
  recipes,
  loading,
  compact,
}: {
  recipes: Recipe[];
  loading: boolean;
  compact?: boolean;
}) {
  if (loading && recipes.length === 0) {
    return <RailSkeleton compact={compact} />;
  }
  if (recipes.length === 0) {
    return (
      <View className="h-32 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          No recipes yet — pull to refresh.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="pr-2">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} variant={compact ? 'compact' : 'wide'} />
      ))}
    </ScrollView>
  );
}

function RailSkeleton({ compact }: { compact?: boolean }) {
  const w = compact ? 'w-44' : 'w-64';
  const h = compact ? 'h-32' : 'h-40';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="pr-2">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className={`mr-3 ${w} overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900`}>
          <View className={`${h} bg-neutral-200 dark:bg-neutral-800`} />
          <View className="p-3">
            <View className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
            <View className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="mb-4 flex-row items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-red-800 dark:text-red-200">
          Couldn&apos;t load recipes
        </Text>
        <Text className="mt-0.5 text-xs text-red-700 dark:text-red-300" numberOfLines={2}>
          {message}
        </Text>
      </View>
      <Pressable
        onPress={onRetry}
        className="ml-3 rounded-lg bg-red-600 px-3 py-1.5 active:opacity-80">
        <Text className="text-xs font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}
