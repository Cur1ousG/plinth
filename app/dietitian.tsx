import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/auth-gate';
import { api } from '@/convex/_generated/api';
import { useEntitlement } from '@/hooks/useEntitlement';
import { convex } from '@/lib/convex';
import type { Recipe } from '@/services/types';

type Goal = 'cut' | 'maintain' | 'bulk';

const GOALS: { id: Goal; label: string; icon: keyof typeof Ionicons.glyphMap; multiplier: number; desc: string }[] = [
  { id: 'cut', label: 'Cut', icon: 'trending-down-outline', multiplier: 24, desc: 'Lose fat while preserving muscle' },
  { id: 'maintain', label: 'Maintain', icon: 'remove-outline', multiplier: 30, desc: 'Keep your current physique' },
  { id: 'bulk', label: 'Bulk', icon: 'trending-up-outline', multiplier: 36, desc: 'Gain muscle, gain weight' },
];

export default function DietitianScreen() {
  return (
    <AuthGate>
      <DietitianInner />
    </AuthGate>
  );
}

function DietitianInner() {
  const router = useRouter();
  const { hasPremium } = useEntitlement();

  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  if (!hasPremium) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Dietitian plan' }} />
        <Ionicons name="lock-closed" size={36} color="#a3a3a3" />
        <Text className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Premium required
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          The dietitian plan is part of Plinth Premium.
        </Text>
      </SafeAreaView>
    );
  }

  const weightNum = Number.parseFloat(weightKg);
  const valid = Number.isFinite(weightNum) && weightNum > 30 && weightNum < 300;
  const goalSpec = GOALS.find((g) => g.id === goal)!;
  const dailyCalories = valid ? Math.round(weightNum * goalSpec.multiplier) : 0;
  const dailyProtein = valid ? Math.round(weightNum * 2.2) : 0;
  const perMealCalories = valid ? Math.round(dailyCalories / 3) : 0;
  const perMealProtein = valid ? Math.round(dailyProtein / 3) : 0;

  const onFindRecipes = async () => {
    if (!valid) {
      Alert.alert('Enter a valid weight', 'Weight should be in kilograms (30–300).');
      return;
    }
    setLoading(true);
    try {
      const data = await convex.action(api.spoonacular.byMacros, {
        maxCalories: perMealCalories,
        minProtein: Math.round(perMealProtein * 0.8),
        number: 12,
      });
      setRecipes(data);
    } catch (err) {
      Alert.alert('Could not load recipes', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Dietitian plan' }} />

      <View className="px-5 py-6">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Tell us your goal
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          We&apos;ll calculate daily calorie and protein targets, then suggest recipes that fit.
        </Text>

        <SectionHeader>Weight (kg)</SectionHeader>
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="e.g. 75"
          placeholderTextColor="#737373"
          keyboardType="numeric"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
        />

        <SectionHeader>Goal</SectionHeader>
        <View className="gap-2">
          {GOALS.map((g) => {
            const active = goal === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGoal(g.id)}
                className={`flex-row items-center rounded-2xl border p-4 ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-800">
                  <Ionicons
                    name={g.icon}
                    size={20}
                    color={active ? '#ea580c' : '#737373'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      active
                        ? 'text-brand-700 dark:text-brand-100'
                        : 'text-neutral-900 dark:text-neutral-50'
                    }`}>
                    {g.label}
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {g.desc}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color="#f97316" />}
              </Pressable>
            );
          })}
        </View>

        {valid && (
          <View className="mt-6 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-900">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Your daily targets
            </Text>
            <View className="flex-row gap-3">
              <Stat label="Calories" value={`${dailyCalories}`} unit="kcal" />
              <Stat label="Protein" value={`${dailyProtein}`} unit="g" />
            </View>
            <Text className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Per meal (3 meals): ~{perMealCalories} kcal · ~{perMealProtein}g protein
            </Text>
          </View>
        )}

        <Pressable
          onPress={onFindRecipes}
          disabled={!valid || loading}
          className={`mt-6 items-center rounded-2xl px-5 py-4 ${
            valid && !loading
              ? 'bg-brand-500 active:opacity-80'
              : 'bg-neutral-200 dark:bg-neutral-800'
          }`}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                valid ? 'text-white' : 'text-neutral-500'
              }`}>
              Find matching recipes
            </Text>
          )}
        </Pressable>

        {recipes.length > 0 && (
          <>
            <Text className="mb-3 mt-8 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Recipes that fit
            </Text>
            <View className="gap-3">
              {recipes.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push({ pathname: '/recipe', params: { id: r.id } })}
                  className="flex-row overflow-hidden rounded-2xl border border-neutral-200 bg-white active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900">
                  <View className="h-20 w-20 bg-neutral-200 dark:bg-neutral-800">
                    {r.thumbnail ? (
                      <Image
                        source={{ uri: r.thumbnail }}
                        style={{ height: '100%', width: '100%' }}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>
                  <View className="flex-1 justify-center p-3">
                    <Text
                      numberOfLines={2}
                      className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      {r.title}
                    </Text>
                    {r.minutes != null && (
                      <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {r.minutes} min
                        {r.cuisine ? ` · ${r.cuisine}` : ''}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      {children}
    </Text>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View className="flex-1 rounded-xl bg-white p-3 dark:bg-neutral-800">
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <View className="mt-1 flex-row items-baseline">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</Text>
        <Text className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">{unit}</Text>
      </View>
    </View>
  );
}
