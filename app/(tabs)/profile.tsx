import { useAuth, useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Row = {
  href: '/your-recipes' | '/shopping-cart' | '/settings';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
};

const rows: Row[] = [
  { href: '/your-recipes', icon: 'book', label: 'My Recipes', sub: 'Saved meals and favorites' },
  { href: '/shopping-cart', icon: 'cart', label: 'Shopping Cart', sub: 'Ingredients you need to buy' },
  { href: '/settings', icon: 'settings', label: 'Settings', sub: 'Preferences and account' },
];

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    'P';

  const displayName =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Signed in';

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="px-5 pt-2 pb-10">
        <Text className="mb-6 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Profile
        </Text>

        <View className="mb-8 flex-row items-center rounded-2xl bg-neutral-100 px-4 py-4 dark:bg-neutral-900">
          <View className="h-14 w-14 overflow-hidden rounded-full bg-brand-500">
            {user?.hasImage && user.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ height: '100%', width: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-xl font-bold text-white">{initial}</Text>
              </View>
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {displayName}
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </Text>
          </View>
        </View>

        <View className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          {rows.map((r, i) => (
            <Link key={r.href} href={{ pathname: r.href, params: { from: 'Profile' } }} asChild>
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
          className="items-center rounded-2xl border border-neutral-200 px-5 py-4 active:bg-neutral-100 dark:border-neutral-800 dark:active:bg-neutral-900">
          <Text className="text-base font-medium text-red-600">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
