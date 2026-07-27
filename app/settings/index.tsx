import { useAuth } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
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

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const version = (Constants.expoConfig?.version as string | undefined) ?? '—';

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ headerBackTitle: from || 'Back' }} />

      <View className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        {rows.map((r, i) => (
          <Link
            key={r.href}
            href={{ pathname: r.href, params: { from: 'Settings' } }}
            asChild>
            <Pressable
              className={`flex-row items-center px-4 py-4 active:bg-neutral-100 dark:active:bg-neutral-900 ${
                i < rows.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''
              }`}>
              <Ionicons name={r.icon} size={22} color="#f97316" />
              <View className="ml-4 flex-1">
                <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
                  {r.label}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">{r.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable
        onPress={onSignOut}
        className="mb-6 items-center rounded-2xl border border-neutral-200 px-5 py-4 active:bg-neutral-100 dark:border-neutral-800 dark:active:bg-neutral-900">
        <Text className="text-base font-medium text-red-600">Sign out</Text>
      </Pressable>

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        About
      </Text>
      <View className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <Row icon="information-circle-outline" label="Version" sub={version} />
        <Divider />
        <Link href="/legal/privacy" asChild>
          <Pressable className="flex-row items-center px-4 py-4 active:bg-neutral-100 dark:active:bg-neutral-900">
            <Ionicons name="document-text-outline" size={22} color="#737373" />
            <Text className="ml-4 flex-1 text-base font-medium text-neutral-900 dark:text-neutral-50">
              Privacy policy
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
          </Pressable>
        </Link>
        <Divider />
        <Link href="/legal/terms" asChild>
          <Pressable className="flex-row items-center px-4 py-4 active:bg-neutral-100 dark:active:bg-neutral-900">
            <Ionicons name="shield-checkmark-outline" size={22} color="#737373" />
            <Text className="ml-4 flex-1 text-base font-medium text-neutral-900 dark:text-neutral-50">
              Terms of service
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
          </Pressable>
        </Link>
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
      <Ionicons name={icon} size={22} color="#737373" />
      <View className="ml-4 flex-1">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
          {label}
        </Text>
        {sub ? (
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-neutral-200 dark:bg-neutral-800" />;
}
