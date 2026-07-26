import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';

export default function YourRecipesScreen() {
  return (
    <AuthGate>
      <YourRecipesInner />
    </AuthGate>
  );
}

function YourRecipesInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { items, ready, remove } = useSavedRecipes();

  const onRemove = (id: string, title: string) => {
    Alert.alert('Remove from saved?', title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  const headerOptions = <Stack.Screen options={{ headerBackTitle: from || 'Back' }} />;

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        {headerOptions}
        <Text className="text-sm text-neutral-500">Loading…</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        {headerOptions}
        <Ionicons name="heart-outline" size={48} color="#a3a3a3" />
        <Text className="mt-4 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          No saved recipes yet
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Tap the heart on any recipe in Home or Discover to save it here.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      {headerOptions}
      <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-5 py-4"
      ItemSeparatorComponent={() => <View className="h-3" />}
      className="flex-1 bg-white dark:bg-neutral-950"
      renderItem={({ item }) => (
        <View className="flex-row overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <View className="h-24 w-24 bg-neutral-200 dark:bg-neutral-800">
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={{ height: '100%', width: '100%' }}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View className="flex-1 justify-center p-3">
            <Text
              numberOfLines={2}
              className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {item.title}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {item.totalTime ?? ''}
              {item.yields ? ` · ${item.yields}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => onRemove(item.id, item.title)}
            hitSlop={8}
            className="items-center justify-center px-3">
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      )}
    />
    </View>
  );
}
