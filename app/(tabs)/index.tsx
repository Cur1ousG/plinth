import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
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
    <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#f97316" />
        }>
        <View className="mb-5">
          <Text className="text-3xl font-bold text-stone-900 dark:text-stone-50">
            {greetingForHour(new Date().getHours())}
          </Text>
          <Text className="mt-1 text-base text-stone-500 dark:text-stone-400">
            What are you cooking today?
          </Text>
        </View>

        <Hero recipe={trending[0]} />

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

/**
 * Darkens the foot of the hero so white text stays legible over any photo.
 *
 * Stacked bands rather than expo-linear-gradient: that package is a native
 * module, and pulling one in invalidates every already-installed build — the
 * app would fail to start with "Cannot find native module" until everyone
 * rebuilt. At eight steps and these opacities the banding isn't perceptible,
 * which is a cheap price for keeping the dependency list where it is.
 */
function Scrim() {
  const bands = 8;
  return (
    <View className="absolute bottom-0 left-0 right-0 h-3/4" pointerEvents="none">
      {Array.from({ length: bands }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            // Eased so the fade starts almost imperceptibly and deepens quickly,
            // rather than greying out the middle of the photograph.
            backgroundColor: `rgba(18,16,14,${(((i + 1) / bands) ** 2 * 0.92).toFixed(3)})`,
          }}
        />
      ))}
    </View>
  );
}

/**
 * The one piece of full-bleed imagery on Home.
 *
 * Every app we looked at opens with a single photograph running edge to edge,
 * and it does most of the work of making the screen feel like a magazine rather
 * than a settings list. It reuses whatever is first in the trending feed, so it
 * costs no extra API call.
 *
 * The `-mx-5` cancels the ScrollView's horizontal padding. Rendering nothing
 * while the feed loads is deliberate — a full-width grey block is worse than
 * the rails simply starting higher for a moment.
 */
function Hero({ recipe }: { recipe: Recipe | undefined }) {
  const router = useRouter();
  if (!recipe?.thumbnail) return null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe', params: { id: recipe.id } })}
      className="-mx-5 mb-6 active:opacity-90">
      <View className="relative h-72 w-full bg-stone-200 dark:bg-stone-800">
        <Image
          source={{ uri: recipe.thumbnail }}
          style={{ height: '100%', width: '100%' }}
          contentFit="cover"
          transition={250}
        />

        <Scrim />

        <View className="absolute bottom-0 left-0 right-0 p-5">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-brand-400">
            Today&apos;s pick
          </Text>
          <Text className="mt-1.5 text-2xl font-bold leading-8 text-white" numberOfLines={2}>
            {recipe.title}
          </Text>
          <View className="mt-2 flex-row items-center">
            {recipe.minutes != null && (
              <Text className="text-xs font-medium text-stone-300">{recipe.minutes} min</Text>
            )}
            {recipe.minutes != null && recipe.siteName ? (
              <Text className="mx-2 text-xs text-stone-400">·</Text>
            ) : null}
            {recipe.siteName ? (
              <Text className="text-xs font-medium text-stone-300" numberOfLines={1}>
                {recipe.siteName}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-7">
      {/* The short brand rule above each heading is the cheapest way to make a
          stack of rails read as an edited magazine rather than a scroll of
          equally-weighted lists. */}
      <View className="mb-1 h-0.5 w-7 rounded-full bg-brand-500" />
      <Text className="mb-3 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
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
      <View className="h-32 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900">
        <Text className="text-sm text-stone-500 dark:text-stone-400">
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
        <View key={i} className={`mr-3 ${w}`}>
          <View className={`${h} rounded-2xl bg-stone-200 dark:bg-stone-800`} />
          <View className="mt-2 h-3.5 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
          <View className="mt-2 h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
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
