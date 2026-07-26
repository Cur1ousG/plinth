import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import {
  DIETARY_OPTIONS,
  useSettings,
  type Appearance,
  type DietaryPreference,
} from '@/providers/settings-provider';

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
  const { appearance, dietary, setAppearance, toggleDietary, ready } = useSettings();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Display', headerBackTitle: from || 'Back' }} />

      <SectionHeader>Theme</SectionHeader>
      <View className="mb-6 flex-row gap-2">
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
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}>
              <Ionicons
                name={opt.icon}
                size={22}
                color={active ? '#ea580c' : '#737373'}
              />
              <Text
                className={`mt-2 text-sm font-medium ${
                  active
                    ? 'text-brand-700 dark:text-brand-100'
                    : 'text-neutral-700 dark:text-neutral-300'
                }`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader>Dietary preferences</SectionHeader>
      <Text className="mb-3 -mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        We&apos;ll bias Discover and meal suggestions toward what you select.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {DIETARY_OPTIONS.map((opt) => {
          const active = dietary.includes(opt.id);
          return (
            <DietPill
              key={opt.id}
              label={opt.label}
              active={active}
              onPress={() => toggleDietary(opt.id as DietaryPreference)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      {children}
    </Text>
  );
}

function DietPill({
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
      className={`flex-row items-center rounded-full border px-4 py-2 ${
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      }`}>
      {active && <Ionicons name="checkmark" size={14} color="#ea580c" />}
      <Text
        className={`text-sm ${active ? 'ml-1 font-semibold text-brand-700 dark:text-brand-100' : 'text-neutral-700 dark:text-neutral-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
