import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Recipe } from '@/services/types';

export function RecipePickerModal({
  visible,
  title = 'Pick a recipe',
  recipes = [],
  onPick,
  onClose,
}: {
  visible: boolean;
  title?: string;
  recipes?: Recipe[];
  onPick: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q) || r.cuisine?.toLowerCase().includes(q));
  }, [query, recipes]);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
        <View className="flex-row items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#78716c" />
          </Pressable>
        </View>

        <View className="px-5 py-3">
          <View className="flex-row items-center rounded-xl bg-stone-100 px-3 py-2 dark:bg-stone-900">
            <Ionicons name="search" size={18} color="#78716c" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search recipes…"
              placeholderTextColor="#78716c"
              className="ml-2 flex-1 text-base text-stone-900 dark:text-stone-50"
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-10"
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item);
                onClose();
              }}
              className="flex-row overflow-hidden rounded-2xl border border-stone-200 bg-white active:opacity-80 dark:border-stone-800 dark:bg-stone-900">
              <View className="h-20 w-20 bg-stone-200 dark:bg-stone-800">
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
                  className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {item.cuisine}
                  {item.minutes != null ? ` · ${item.minutes} min` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className="text-sm text-stone-500 dark:text-stone-400">
                No recipes match your search.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
