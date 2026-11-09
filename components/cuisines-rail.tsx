import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useEntitlement } from '@/hooks/useEntitlement';

/**
 * Only cuisines Spoonacular can actually fill a grid for.
 *
 * Measured against the live API on 2026-10-29, totals for the whole corpus
 * (5,221 recipes) with no dietary filters applied:
 *
 *   Mediterranean 370  American 346  Italian 271  Mexican 179  Indian 121
 *   French 71  Chinese 43  Middle Eastern 32  Japanese 29  Greek 28
 *   Spanish 28  Thai 25  Korean 23  Vietnamese 14  Nordic 6  Caribbean 5
 *   African 2
 *
 * African is deliberately absent. The grid requests 16 and two exist, so a
 * subscriber who paid for cuisine browsing tapped it and got two cards — worse
 * than not offering it. Put it back when there are recipes to put behind it,
 * which realistically means a curated collection of our own rather than a
 * bigger Spoonacular plan: the corpus is identical on every tier.
 */
const CUISINES: { id: string; label: string; emoji: string }[] = [
  { id: 'Italian', label: 'Italian', emoji: '🇮🇹' },
  { id: 'Mexican', label: 'Mexican', emoji: '🇲🇽' },
  { id: 'Japanese', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'Chinese', label: 'Chinese', emoji: '🇨🇳' },
  { id: 'Thai', label: 'Thai', emoji: '🇹🇭' },
  { id: 'Indian', label: 'Indian', emoji: '🇮🇳' },
  { id: 'French', label: 'French', emoji: '🇫🇷' },
  { id: 'Greek', label: 'Greek', emoji: '🇬🇷' },
  { id: 'Spanish', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'Korean', label: 'Korean', emoji: '🇰🇷' },
  { id: 'Vietnamese', label: 'Vietnamese', emoji: '🇻🇳' },
  { id: 'American', label: 'American', emoji: '🇺🇸' },
  { id: 'Mediterranean', label: 'Mediterranean', emoji: '🌊' },
  { id: 'Middle Eastern', label: 'Middle Eastern', emoji: '🥙' },
];

export function CuisinesRail() {
  const { hasPremium } = useEntitlement();

  if (!hasPremium) {
    return <PremiumLock />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="pr-2">
      {CUISINES.map((c) => (
        <Link
          key={c.id}
          href={{ pathname: '/cuisine/[name]', params: { name: c.id } }}
          asChild>
          <Pressable className="mr-2 flex-row items-center rounded-full border border-stone-200 bg-white px-4 py-2 active:opacity-70 dark:border-stone-800 dark:bg-stone-900">
            <Text className="mr-1 text-base">{c.emoji}</Text>
            <Text className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {c.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

function PremiumLock() {
  return (
    <Link href="/premium" asChild>
      <Pressable className="flex-row items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 active:opacity-70 dark:border-stone-800 dark:bg-stone-900">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <Ionicons name="lock-closed" size={18} color="#ea580c" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            Browse by cuisine
          </Text>
          <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Unlock with Plinth Premium
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
      </Pressable>
    </Link>
  );
}
