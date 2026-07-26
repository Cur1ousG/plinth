import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';

import { api } from '@/convex/_generated/api';
import {
  calendarEntryId,
  type CalendarEntry,
  type MealSlot,
} from '@/services/types';

const VALID_SLOTS: ReadonlyArray<MealSlot> = ['breakfast', 'lunch', 'dinner', 'dessert'];

function normalizeSlot(slot: string): MealSlot {
  return (VALID_SLOTS as readonly string[]).includes(slot) ? (slot as MealSlot) : 'dinner';
}

export function useCalendar(fromISO: string, toISO: string) {
  const { isSignedIn } = useUser();

  const docs = useQuery(
    api.calendarEntries.listForRange,
    isSignedIn ? { fromISO, toISO } : 'skip',
  );
  const setMutation = useMutation(api.calendarEntries.set);
  const removeMutation = useMutation(api.calendarEntries.remove);

  const entries: CalendarEntry[] = useMemo(
    () =>
      (docs ?? []).map((d) => ({
        id: d.entryKey,
        date: d.date,
        slot: normalizeSlot(d.slot),
        recipeId: d.recipeId,
        recipeTitle: d.recipeTitle,
        recipeThumbnail: d.recipeThumbnail,
      })),
    [docs],
  );

  const setEntry = useCallback(
    async (entry: CalendarEntry) => {
      const entryKey = entry.id || calendarEntryId(entry.date, entry.slot);
      await setMutation({
        entryKey,
        date: entry.date,
        slot: entry.slot,
        recipeId: entry.recipeId,
        recipeTitle: entry.recipeTitle,
        recipeThumbnail: entry.recipeThumbnail,
      });
    },
    [setMutation],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      await removeMutation({ entryKey: entryId });
    },
    [removeMutation],
  );

  const entriesForDate = useCallback(
    (dateISO: string) => entries.filter((e) => e.date === dateISO),
    [entries],
  );

  const entryForDateAndSlot = useCallback(
    (dateISO: string, slot: MealSlot) =>
      entries.find((e) => e.date === dateISO && e.slot === slot),
    [entries],
  );

  return {
    entries,
    ready: docs !== undefined,
    refresh: async () => undefined,
    setEntry,
    removeEntry,
    entriesForDate,
    entryForDateAndSlot,
  };
}
