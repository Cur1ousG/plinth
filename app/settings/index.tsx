import { useAuth } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';

type RowSpec = {
  href:
    | '/settings/account'
    | '/settings/food'
    | '/settings/notifications'
    | '/settings/language'
    | '/settings/display';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
};

const rows: RowSpec[] = [
  {
    href: '/settings/account',
    icon: 'person-circle-outline',
    label: 'Account',
    sub: 'Name, email, password',
  },
  {
    href: '/settings/food',
    icon: 'nutrition-outline',
    label: 'Food preferences',
    sub: 'Diet, allergies, ingredients to avoid',
  },
  {
    href: '/settings/notifications',
    icon: 'notifications-outline',
    label: 'Notifications',
    sub: 'Push, daily reminders, email, SMS',
  },
  {
    href: '/settings/language',
    icon: 'language-outline',
    label: 'Language',
    sub: 'Preferred language',
  },
  {
    href: '/settings/display',
    icon: 'color-palette-outline',
    label: 'Display',
    sub: 'Appearance, theme',
  },
];

export default function SettingsScreen() {
  return (
    <AuthGate>
      <SettingsInner />
    </AuthGate>
  );
}

function SettingsInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { signOut } = useAuth();

  const openSpoonacular = () => {
    void WebBrowser.openBrowserAsync('https://spoonacular.com/food-api').catch(() => {});
  };

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const version = (Constants.expoConfig?.version as string | undefined) ?? '—';

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-charcoal"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ headerBackTitle: from || 'Back' }} />

      <View className="mb-6 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        {rows.map((r, i) => (
          <Link
            key={r.href}
            href={{ pathname: r.href, params: { from: 'Settings' } }}
            asChild>
            <Pressable
              className={`flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900 ${
                i < rows.length - 1 ? 'border-b border-stone-200 dark:border-stone-800' : ''
              }`}>
              <Ionicons name={r.icon} size={22} color="#f97316" />
              <View className="ml-4 flex-1">
                <Text className="text-base font-medium text-stone-900 dark:text-stone-50">
                  {r.label}
                </Text>
                <Text className="text-xs text-stone-500 dark:text-stone-400">{r.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable
        onPress={onSignOut}
        className="mb-6 items-center rounded-2xl border border-stone-200 px-5 py-4 active:bg-stone-100 dark:border-stone-800 dark:active:bg-stone-900">
        <Text className="text-base font-medium text-red-600">Sign out</Text>
      </Pressable>

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        About
      </Text>
      <View className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <Row icon="information-circle-outline" label="Version" sub={version} />
        <Divider />
        <Link href="/legal/privacy" asChild>
          <Pressable className="flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900">
            <Ionicons name="document-text-outline" size={22} color="#78716c" />
            <Text className="ml-4 flex-1 text-base font-medium text-stone-900 dark:text-stone-50">
              Privacy policy
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
          </Pressable>
        </Link>
        <Divider />
        <Link href="/legal/terms" asChild>
          <Pressable className="flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900">
            <Ionicons name="shield-checkmark-outline" size={22} color="#78716c" />
            <Text className="ml-4 flex-1 text-base font-medium text-stone-900 dark:text-stone-50">
              Terms of service
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
          </Pressable>
        </Link>
        <Divider />
        <Pressable
          onPress={openSpoonacular}
          className="flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900">
          <Ionicons name="restaurant-outline" size={22} color="#78716c" />
          <View className="ml-4 flex-1">
            <Text className="text-base font-medium text-stone-900 dark:text-stone-50">
              Recipe data
            </Text>
            <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Powered by Spoonacular
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#a8a29e" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
}) {
  return (
    <View className="flex-row items-center px-4 py-4">
      <Ionicons name={icon} size={22} color="#78716c" />
      <View className="ml-4 flex-1">
        <Text className="text-base font-medium text-stone-900 dark:text-stone-50">
          {label}
        </Text>
        {sub ? (
          <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-stone-200 dark:bg-stone-800" />;
}
