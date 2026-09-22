import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import { useCart } from '@/hooks/useCart';
import { AISLE_ORDER, aisleFor, type Aisle } from '@/lib/aisles';
import type { CartItem } from '@/services/types';

export default function ShoppingCartScreen() {
  return (
    <AuthGate>
      <ShoppingCartInner />
    </AuthGate>
  );
}

function ShoppingCartInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { items, ready, toggle, remove, clearChecked, lists, activeList, setActiveList } =
    useCart();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Grouped by aisle so the list can be walked in one pass. Within an aisle,
  // unticked items come first — the ones still to find are what you're
  // scanning for.
  const sections = useMemo(() => {
    const byAisle = new Map<Aisle, CartItem[]>();
    for (const item of items) {
      const aisle = aisleFor(item.name);
      byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), item]);
    }
    return AISLE_ORDER.filter((a) => byAisle.has(a)).map((aisle) => ({
      title: aisle,
      data: [...byAisle.get(aisle)!].sort((a, b) => Number(a.checked) - Number(b.checked)),
    }));
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;

  const onClearChecked = () => {
    if (checkedCount === 0) return;
    Alert.alert(
      'Clear checked items?',
      `${checkedCount} item${checkedCount === 1 ? '' : 's'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearChecked() },
      ],
    );
  };

  const headerOptions = (
    <Stack.Screen
      options={{
        headerBackTitle: from || 'Back',
        headerRight: () => (
          <Pressable onPress={() => setSheetOpen(true)} hitSlop={10} className="px-1">
            <Ionicons name="people-outline" size={24} color="#ea580c" />
          </Pressable>
        ),
      }}
    />
  );

  const shareSheet = (
    <ShareSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
  );

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-cream dark:bg-charcoal">
        {headerOptions}
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream dark:bg-charcoal">
      {headerOptions}
      {shareSheet}

      <ListHeader
        lists={lists}
        activeId={activeList?.id}
        onSelect={setActiveList}
        onShare={() => setSheetOpen(true)}
      />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cart-outline" size={48} color="#a8a29e" />
          <Text className="mt-4 text-center text-lg font-semibold text-stone-900 dark:text-stone-50">
            Nothing on this list yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-stone-500 dark:text-stone-400">
            Open a recipe and tap &quot;Add to shopping cart&quot;. If someone you live with has
            a list, you can join theirs instead.
          </Text>
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="mt-5 rounded-2xl border border-stone-300 px-5 py-2.5 active:opacity-70 dark:border-stone-700">
            <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Share or join a list
            </Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerClassName="px-5 pb-28"
          renderSectionHeader={({ section }) => (
            <Text className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggle(item.id)}
              className="flex-row items-center rounded-xl px-3 py-3 active:bg-stone-100 dark:active:bg-stone-900">
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${
                  item.checked
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-stone-300 dark:border-stone-700'
                }`}>
                {item.checked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
              </View>
              <Text
                numberOfLines={2}
                className={`flex-1 text-sm ${
                  item.checked
                    ? 'text-stone-400 line-through dark:text-stone-600'
                    : 'text-stone-900 dark:text-stone-50'
                }`}>
                {item.name}
              </Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  void remove(item.id);
                }}
                hitSlop={8}
                className="ml-2 p-1">
                <Ionicons name="close" size={16} color="#a8a29e" />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {checkedCount > 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-stone-200 bg-cream px-5 py-3 dark:border-stone-800 dark:bg-charcoal">
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

/* -------------------------------------------------------------------------- */

function ListHeader({
  lists,
  activeId,
  onSelect,
  onShare,
}: {
  lists: ReturnType<typeof useCart>['lists'];
  activeId: string | undefined;
  onSelect: (id: ReturnType<typeof useCart>['lists'][number]['id']) => void;
  onShare: () => void;
}) {
  const active = lists.find((l) => l.id === activeId);
  if (!active) return null;

  const who =
    active.memberCount <= 1 ? 'Just you' : `Shared with ${active.memberCount - 1} other${active.memberCount === 2 ? '' : 's'}`;

  return (
    <View className="border-b border-stone-200 px-5 pb-3 pt-3 dark:border-stone-800">
      <Pressable onPress={onShare} className="flex-row items-center active:opacity-70">
        <View className="flex-1">
          <Text className="text-lg font-bold text-stone-900 dark:text-stone-50" numberOfLines={1}>
            {active.name}
          </Text>
          <Text className="text-xs text-stone-500 dark:text-stone-400">{who}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
      </Pressable>

      {/* Only shown once there's a choice to make. */}
      {lists.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="pt-3 pr-2">
          {lists.map((l) => {
            const on = l.id === activeId;
            return (
              <Pressable
                key={l.id}
                onPress={() => onSelect(l.id)}
                className={`mr-2 rounded-full border px-3.5 py-1.5 ${
                  on
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
                    : 'border-stone-200 dark:border-stone-800'
                }`}>
                <Text
                  className={`text-xs ${
                    on
                      ? 'font-semibold text-brand-700 dark:text-brand-100'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}>
                  {l.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Inviting and joining in one place, because they're the same act seen from
 * two sides of a kitchen: one person reads a code out, the other types it in.
 */
function ShareSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { activeList, createInvite, joinByCode, leaveActiveList, renameActiveList } = useCart();
  const [invite, setInvite] = useState<{ code: string; expiresAt: number } | null>(null);
  const [busy, setBusy] = useState<'invite' | 'join' | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const close = () => {
    setInvite(null);
    setCode('');
    setName('');
    onClose();
  };

  const onInvite = async () => {
    setBusy('invite');
    try {
      setInvite(await createInvite());
    } catch (err) {
      Alert.alert('Could not create a code', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const onShareCode = () => {
    if (!invite) return;
    void Share.share({
      message:
        `Join my Plinth shopping list with the code ${invite.code}.\n\n` +
        'Open Plinth, go to your shopping cart, tap the people icon and choose "Join a list". ' +
        'The code works for 7 days.',
    });
  };

  const onJoin = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      Alert.alert('Check the code', 'Invite codes are 6 characters long.');
      return;
    }
    setBusy('join');
    try {
      await joinByCode(clean);
      close();
    } catch (err) {
      Alert.alert('Could not join', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const onRename = async () => {
    const clean = name.trim();
    if (!clean) return;
    await renameActiveList(clean).catch(() => {});
    setName('');
  };

  const onLeave = () => {
    Alert.alert('Leave this list?', "You'll stop seeing what's on it. Someone can invite you back.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveActiveList();
            close();
          } catch (err) {
            Alert.alert('Could not leave', err instanceof Error ? err.message : 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={close} />
        <View className="rounded-t-3xl bg-cream px-5 pb-10 pt-4 dark:bg-charcoal">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-stone-300 dark:bg-stone-700" />

          <Text className="text-xl font-bold text-stone-900 dark:text-stone-50">
            {activeList?.name ?? 'Shopping list'}
          </Text>
          <Text className="mb-5 mt-1 text-sm text-stone-500 dark:text-stone-400">
            Share it with the people you shop with. Everyone sees the same list, live.
          </Text>

          {/* Invite */}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Invite someone
          </Text>
          {invite ? (
            <View className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <Text
                selectable
                className="text-center text-3xl font-bold tracking-[6px] text-stone-900 dark:text-stone-50">
                {invite.code}
              </Text>
              <Text className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400">
                Works for 7 days. Making a new one cancels this one.
              </Text>
              <Pressable
                onPress={onShareCode}
                className="mt-3 items-center rounded-xl bg-brand-500 py-3 active:opacity-80">
                <Text className="text-sm font-semibold text-white">Send the code</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onInvite}
              disabled={busy !== null}
              className="items-center rounded-2xl bg-brand-500 py-3.5 active:opacity-80 disabled:opacity-60">
              {busy === 'invite' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Get an invite code</Text>
              )}
            </Pressable>
          )}

          {/* Join */}
          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Join a list
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#a8a29e"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base tracking-[4px] text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
            />
            <Pressable
              onPress={onJoin}
              disabled={busy !== null}
              className="ml-2 rounded-xl border border-stone-300 px-4 py-3 active:opacity-70 disabled:opacity-60 dark:border-stone-700">
              {busy === 'join' ? (
                <ActivityIndicator color="#ea580c" />
              ) : (
                <Text className="text-sm font-semibold text-stone-800 dark:text-stone-200">Join</Text>
              )}
            </Pressable>
          </View>

          {/* Rename */}
          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Rename
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={activeList?.name ?? 'Our shopping'}
              placeholderTextColor="#a8a29e"
              maxLength={60}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
            />
            <Pressable
              onPress={onRename}
              className="ml-2 rounded-xl border border-stone-300 px-4 py-3 active:opacity-70 dark:border-stone-700">
              <Text className="text-sm font-semibold text-stone-800 dark:text-stone-200">Save</Text>
            </Pressable>
          </View>

          {/* Only people who joined can leave; the owner's list is theirs to keep. */}
          {activeList && !activeList.isOwner ? (
            <Pressable onPress={onLeave} className="mt-6 items-center py-2">
              <Text className="text-sm font-medium text-red-600">Leave this list</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
