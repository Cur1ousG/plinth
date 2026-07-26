import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { LANGUAGE_OPTIONS, useSettings } from '@/providers/settings-provider';

export default function LanguageSettings() {
  return (
    <AuthGate>
      <LanguageInner />
    </AuthGate>
  );
}

function LanguageInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { language, setLanguage } = useSettings();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Language', headerBackTitle: from || 'Back' }} />

      <Text className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Choose your preferred language. Full localization is rolling out — for now, your selection
        is saved and will apply when language packs ship.
      </Text>

      <View className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        {LANGUAGE_OPTIONS.map((opt, i) => {
          const active = language === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => setLanguage(opt.code)}
              className={`flex-row items-center px-4 py-4 active:bg-neutral-100 dark:active:bg-neutral-900 ${
                i < LANGUAGE_OPTIONS.length - 1
                  ? 'border-b border-neutral-200 dark:border-neutral-800'
                  : ''
              }`}>
              <View className="flex-1">
                <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
                  {opt.label}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  {opt.native}
                </Text>
              </View>
              {active && <Ionicons name="checkmark" size={22} color="#f97316" />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
