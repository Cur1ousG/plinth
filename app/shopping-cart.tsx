import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { useCart } from '@/hooks/useCart';

export default function ShoppingCartScreen() {
  return (
    <AuthGate>
      <ShoppingCartInner />
    </AuthGate>
  );
}

function ShoppingCartInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { items, ready, toggle, remove, clearChecked } = useCart();

  const onClearChecked = () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    Alert.alert(
      'Clear checked items?',
      `${checked.length} item${checked.length === 1 ? '' : 's'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearChecked() },
      ],
    );
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
        <Ionicons name="cart-outline" size={48} color="#a3a3a3" />
        <Text className="mt-4 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Your cart is empty
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Open a recipe and tap &quot;Add to shopping cart&quot; to populate this list.
        </Text>
      </View>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      {headerOptions}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 py-4 pb-24"
        ItemSeparatorComponent={() => <View className="h-1" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggle(item.id)}
            className="flex-row items-center rounded-xl px-3 py-3 active:bg-neutral-100 dark:active:bg-neutral-900">
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${
                item.checked
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}>
              {item.checked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
            </View>
            <Text
              numberOfLines={2}
              className={`flex-1 text-sm ${
                item.checked
                  ? 'text-neutral-400 line-through dark:text-neutral-600'
                  : 'text-neutral-900 dark:text-neutral-50'
              }`}>
              {item.name}
            </Text>
            <Pressable
              onPress={() => remove(item.id)}
              hitSlop={8}
              className="ml-2 p-1">
              <Ionicons name="close" size={16} color="#a3a3a3" />
            </Pressable>
          </Pressable>
        )}
      />

      {checkedCount > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
          <Pressable
            onPress={onClearChecked}
            className="items-center rounded-2xl bg-brand-500 px-5 py-3 active:opacity-80">
            <Text className="text-base font-semibold text-white">
              Clear {checkedCount} checked item{checkedCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}