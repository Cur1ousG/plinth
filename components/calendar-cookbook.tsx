import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useCalendar } from '@/hooks/useCalendar';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { buildWeek } from '@/lib/dates';
import {
  MEAL_SLOTS,
  calendarEntryId,
  type CalendarEntry,
  type MealSlot,
  type Recipe,
} from '@/services/types';

import { RecipePickerModal } from './recipe-picker-modal';

const SLOT_ICON: Record<MealSlot, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  dessert: 'ice-cream-outline',
};

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  dessert: 'Dessert',
};

type PickerTarget = { date: string; slot: MealSlot } | null;

export function CalendarCookbook() {
  const router = useRouter();
  const days = useMemo(() => buildWeek(), []);
  const range = useMemo(() => ({ from: days[0].iso, to: days[days.length - 1].iso }), [days]);
  const { entries, setEntry, removeEntry, entriesForDate, entryForDateAndSlot } = useCalendar(
    range.from,
    range.to,
  );
  const { trending, quickWeeknight, weekendProjects } = useHomeFeed();

  const pickerRecipes = useMemo(
    () => dedupe([...trending, ...quickWeeknight, ...weekendProjects]),
    [trending, quickWeeknight, weekendProjects],
  );

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [selectedISO, setSelectedISO] = useState<string>(
    days.find((d) => d.isToday)?.iso ?? days[0].iso,
  );

  const onPick = async (recipe: Recipe) => {
    if (!pickerTarget) return;
    await setEntry({
      id: calendarEntryId(pickerTarget.date, pickerTarget.slot),
      date: pickerTarget.date,
      slot: pickerTarget.slot,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeThumbnail: recipe.thumbnail,
    });
  };

  const onClear = (entry: CalendarEntry) => {
    Alert.alert(
      'Clear meal?',
      `Remove ${entry.recipeTitle} from ${SLOT_LABEL[entry.slot]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => removeEntry(entry.id) },
      ],
    );
  };

  const onOpen = (entry: CalendarEntry) => {
    if (!entry.recipeId) return;
    router.push({ pathname: '/recipe', params: { id: entry.recipeId } });
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="pr-2">
        {days.map((d) => {
          const dayEntries = entriesForDate(d.iso);
          const isSelected = d.iso === selectedISO;
          return (
            <Pressable
              key={d.iso}
              onPress={() => setSelectedISO(d.iso)}
              className={`mr-2 w-16 items-center rounded-2xl border px-2 py-3 ${
                isSelected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}>
              <Text
                className={`text-xs ${
                  d.isToday
                    ? 'font-bold text-brand-600'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}>
                {d.label.toUpperCase()}
              </Text>
              <Text
                className={`mt-1 text-lg font-semibold ${
                  isSelected
                    ? 'text-brand-700 dark:text-brand-100'
                    : 'text-neutral-900 dark:text-neutral-50'
                }`}>
                {d.dayNum}
              </Text>
              <View className="mt-2 h-1.5 flex-row items-center">
                {dayEntries.slice(0, 3).map((_, i) => (
                  <View key={i} className="ml-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-4 gap-2">
        {MEAL_SLOTS.map((slot) => {
          const entry = entryForDateAndSlot(selectedISO, slot);
          return (
            <SlotRow
              key={slot}
              slot={slot}
              entry={entry}
              onPlan={() => setPickerTarget({ date: selectedISO, slot })}
              onOpen={onOpen}
              onClear={onClear}
            />
          );
        })}
      </View>

      <RecipePickerModal
        visible={pickerTarget !== null}
        title={pickerTarget ? `Plan ${SLOT_LABEL[pickerTarget.slot].toLowerCase()}` : 'Plan a meal'}
        recipes={pickerRecipes}
        onClose={() => setPickerTarget(null)}
        onPick={onPick}
      />
    </View>
  );
}

function SlotRow({
  slot,
  entry,
  onPlan,
  onOpen,
  onClear,
}: {
  slot: MealSlot;
  entry: CalendarEntry | undefined;
  onPlan: () => void;
  onOpen: (entry: CalendarEntry) => void;
  onClear: (entry: CalendarEntry) => void;
}) {
  if (entry) {
    return (
      <Pressable
        onPress={() => onOpen(entry)}
        className="flex-row items-center rounded-2xl border border-neutral-200 bg-white p-3 active:opacity-70 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="h-12 w-12 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
          {entry.recipeThumbnail ? (
            <Image
              source={{ uri: entry.recipeThumbnail }}
              style={{ height: '100%', width: '100%' }}
              contentFit="cover"
            />
          ) : null}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Ionicons name={SLOT_ICON[slot]} size={12} color="#737373" />
            <Text className="ml-1 text-xs uppercase text-neutral-500 dark:text-neutral-400">
              {SLOT_LABEL[slot]}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {entry.recipeTitle}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onClear(entry);
          }}
          hitSlop={8}
          className="p-2">
          <Ionicons name="close-circle" size={20} color="#a3a3a3" />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPlan}
      className="flex-row items-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3 active:opacity-70 dark:border-neutral-700 dark:bg-neutral-900">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <Ionicons name={SLOT_ICON[slot]} size={20} color="#737373" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs uppercase text-neutral-500 dark:text-neutral-400">
          {SLOT_LABEL[slot]}
        </Text>
        <Text className="mt-0.5 text-sm font-medium text-brand-600">+ Plan a meal</Text>
      </View>
    </Pressable>
  );
}

function dedupe(recipes: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  const out: Recipe[] = [];
  for (const r of recipes) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}
