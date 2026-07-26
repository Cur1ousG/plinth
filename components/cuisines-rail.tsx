import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useEntitlement } from '@/hooks/useEntitlement';

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
  { id: 'African', label: 'African', emoji: '🌍' },
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
          <Pressable className="mr-2 flex-row items-center rounded-full border border-neutral-200 bg-white px-4 py-2 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="mr-1 text-base">{c.emoji}</Text>
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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
      <Pressable className="flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <Ionicons name="lock-closed" size={18} color="#ea580c" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Browse by cuisine
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Unlock with Plinth Premium
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
      </Pressable>
    </Link>
  );
}
