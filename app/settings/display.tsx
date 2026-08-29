import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { useSettings, type Appearance } from '@/providers/settings-provider';

const APPEARANCE_OPTIONS: { id: Appearance; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function DisplaySettings() {
  return (
    <AuthGate>
      <DisplayInner />
    </AuthGate>
  );
}

function DisplayInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { appearance, setAppearance, ready } = useSettings();

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-charcoal"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Display', headerBackTitle: from || 'Back' }} />

      <SectionHeader>Theme</SectionHeader>
      <View className="flex-row gap-2">
        {APPEARANCE_OPTIONS.map((opt) => {
          const active = appearance === opt.id;
          return (
            <Pressable
              key={opt.id}
              disabled={!ready}
              onPress={() => setAppearance(opt.id)}
              className={`flex-1 items-center rounded-2xl border px-3 py-4 ${
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
                  : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
              }`}>
              <Ionicons name={opt.icon} size={22} color={active ? '#ea580c' : '#78716c'} />
              <Text
                className={`mt-2 text-sm font-medium ${
                  active
                    ? 'text-brand-700 dark:text-brand-100'
                    : 'text-stone-700 dark:text-stone-300'
                }`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-4 text-xs text-stone-500 dark:text-stone-400">
        Looking for dietary settings? They moved to Settings → Food preferences.
      </Text>
    </ScrollView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
      {children}
    </Text>
  );
}
