import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import {
  DIETARY_OPTIONS,
  INTOLERANCE_OPTIONS,
  useSettings,
  type DietaryPreference,
  type Intolerance,
} from '@/providers/settings-provider';

export default function FoodSettings() {
  return (
    <AuthGate>
      <FoodInner />
    </AuthGate>
  );
}

function FoodInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const {
    dietary,
    intolerances,
    excludedIngredients,
    toggleDietary,
    toggleIntolerance,
    addExcludedIngredient,
    removeExcludedIngredient,
  } = useSettings();

  const [draft, setDraft] = useState('');

  const onAdd = async () => {
    const clean = draft.trim();
    if (!clean) return;
    await addExcludedIngredient(clean);
    setDraft('');
  };

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-charcoal"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Food preferences', headerBackTitle: from || 'Back' }} />

      <Text className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        These apply everywhere recipes appear — Discover, your home feed, cuisine browsing, and
        the dietitian plan.
      </Text>

      <SectionHeader>Diet</SectionHeader>
      <Text className="mb-3 -mt-1 text-xs text-stone-500 dark:text-stone-400">
        Pick the eating pattern you follow. If you select more than one, we use the strictest.
      </Text>
      <View className="mb-8 flex-row flex-wrap gap-2">
        {DIETARY_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            active={dietary.includes(opt.id)}
            onPress={() => toggleDietary(opt.id as DietaryPreference)}
          />
        ))}
      </View>

      <SectionHeader>Allergies &amp; intolerances</SectionHeader>
      <Text className="mb-3 -mt-1 text-xs text-stone-500 dark:text-stone-400">
        Recipes containing anything you select here are excluded entirely, not just ranked lower.
      </Text>
      <View className="mb-8 flex-row flex-wrap gap-2">
        {INTOLERANCE_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            note={opt.note}
            active={intolerances.includes(opt.id)}
            onPress={() => toggleIntolerance(opt.id as Intolerance)}
          />
        ))}
      </View>

      <SectionHeader>Ingredients to avoid</SectionHeader>
      <Text className="mb-3 -mt-1 text-xs text-stone-500 dark:text-stone-400">
        Anything else you&apos;d rather not see — a disliked ingredient, something you&apos;re out
        of, or a restriction we don&apos;t list above.
      </Text>

      <View className="mb-3 flex-row gap-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onAdd}
          placeholder="e.g. cilantro"
          placeholderTextColor="#78716c"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
        />
        <Pressable
          onPress={onAdd}
          disabled={!draft.trim()}
          className={`items-center justify-center rounded-xl px-5 ${
            draft.trim() ? 'bg-brand-500 active:opacity-80' : 'bg-stone-200 dark:bg-stone-800'
          }`}>
          <Text
            className={`text-sm font-semibold ${
              draft.trim() ? 'text-white' : 'text-stone-500'
            }`}>
            Add
          </Text>
        </Pressable>
      </View>

      {excludedIngredients.length === 0 ? (
        <Text className="text-xs text-stone-400 dark:text-stone-600">
          Nothing excluded yet.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {excludedIngredients.map((name) => (
            <Pressable
              key={name}
              onPress={() => removeExcludedIngredient(name)}
              className="flex-row items-center rounded-full border border-brand-500 bg-brand-50 px-3 py-2 active:opacity-70 dark:bg-brand-900">
              <Text className="text-sm text-brand-700 dark:text-brand-100">{name}</Text>
              <Ionicons name="close" size={14} color="#ea580c" style={{ marginLeft: 6 }} />
            </Pressable>
          ))}
        </View>
      )}

      <View className="h-10" />
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

function Chip({
  label,
  note,
  active,
  onPress,
}: {
  label: string;
  note?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full border px-4 py-2 ${
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
          : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
      }`}>
      {active && <Ionicons name="checkmark" size={14} color="#ea580c" />}
      <View className={active ? 'ml-1' : undefined}>
        <Text
          className={`text-sm ${
            active
              ? 'font-semibold text-brand-700 dark:text-brand-100'
              : 'text-stone-700 dark:text-stone-300'
          }`}>
          {label}
        </Text>
        {note ? (
          <Text className="text-[10px] text-stone-500 dark:text-stone-400">{note}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
