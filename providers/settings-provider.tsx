import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/convex/_generated/api';

export type Appearance = 'light' | 'dark' | 'system';

/**
 * Eating patterns. Spoonacular treats these as a `diet` — we send at most one,
 * preferring the strictest when several are selected.
 */
export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'pescetarian'
  | 'ketogenic'
  | 'paleo'
  | 'whole30'
  // Legacy ids, kept so existing saved settings keep working. These are now
  // represented as intolerances instead (see INTOLERANCE_OPTIONS).
  | 'glutenFree'
  | 'dairyFree';

export const DIETARY_OPTIONS: { id: DietaryPreference; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescetarian', label: 'Pescetarian' },
  { id: 'ketogenic', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'whole30', label: 'Whole30' },
];

/**
 * Allergens and intolerances. Spoonacular excludes recipes containing any of
 * these outright, which is what someone with celiac or a nut allergy needs —
 * a dietary "preference" isn't strong enough.
 *
 * Ids match Spoonacular's intolerance values exactly.
 */
export type Intolerance =
  | 'dairy'
  | 'egg'
  | 'gluten'
  | 'grain'
  | 'peanut'
  | 'seafood'
  | 'sesame'
  | 'shellfish'
  | 'soy'
  | 'sulfite'
  | 'tree nut'
  | 'wheat';

export const INTOLERANCE_OPTIONS: { id: Intolerance; label: string; note?: string }[] = [
  { id: 'dairy', label: 'Dairy', note: 'Includes lactose' },
  { id: 'gluten', label: 'Gluten', note: 'For celiac disease' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'grain', label: 'Grain' },
  { id: 'egg', label: 'Egg' },
  { id: 'peanut', label: 'Peanut' },
  { id: 'tree nut', label: 'Tree nut' },
  { id: 'soy', label: 'Soy' },
  { id: 'sesame', label: 'Sesame' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'sulfite', label: 'Sulfite' },
];

export const LANGUAGE_OPTIONS: { code: string; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ko', label: 'Korean', native: '한국어' },
];

export type NotificationPrefs = {
  push: boolean;
  dailyReminder: boolean;
  dailyReminderHour: number;
  email: boolean;
  sms: boolean;
};

type Settings = {
  appearance: Appearance;
  dietary: DietaryPreference[];
  intolerances: Intolerance[];
  /** Free-text ingredients the user wants excluded, e.g. "cilantro", "mushrooms". */
  excludedIngredients: string[];
  language: string;
  notifications: NotificationPrefs;
  onboardedAt: number | null;
};

type Ctx = Settings & {
  ready: boolean;
  setAppearance: (a: Appearance) => Promise<void>;
  toggleDietary: (d: DietaryPreference) => Promise<void>;
  toggleIntolerance: (i: Intolerance) => Promise<void>;
  addExcludedIngredient: (name: string) => Promise<void>;
  removeExcludedIngredient: (name: string) => Promise<void>;
  setLanguage: (code: string) => Promise<void>;
  setNotifications: (next: Partial<NotificationPrefs>) => Promise<void>;
  markOnboarded: () => Promise<void>;
};

// Settings are namespaced per user so signing in as a different account on the same
// device gives them their own onboarding flow, dietary prefs, etc.
const storageKey = (userId: string | null | undefined) =>
  `plinth/settings/v2/${userId ?? 'guest'}`;

const defaultNotifications: NotificationPrefs = {
  push: false,
  dailyReminder: false,
  dailyReminderHour: 18,
  email: false,
  sms: false,
};

const defaults: Settings = {
  appearance: 'system',
  dietary: [],
  intolerances: [],
  excludedIngredients: [],
  language: 'en',
  notifications: defaultNotifications,
  onboardedAt: null,
};

/**
 * Older builds stored gluten-free / dairy-free as dietary preferences. They're
 * intolerances now, so migrate them across on read rather than silently losing
 * someone's allergy settings.
 */
function migrateLegacyDietary(
  dietary: DietaryPreference[],
  intolerances: Intolerance[],
): Intolerance[] {
  const migrated = new Set(intolerances);
  if (dietary.includes('glutenFree')) migrated.add('gluten');
  if (dietary.includes('dairyFree')) migrated.add('dairy');
  return [...migrated];
}

const SettingsContext = createContext<Ctx | null>(null);

function parseStored(raw: string | null): Settings {
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const dietary = parsed.dietary ?? defaults.dietary;
    return {
      appearance: parsed.appearance ?? defaults.appearance,
      dietary,
      intolerances: migrateLegacyDietary(dietary, parsed.intolerances ?? []),
      excludedIngredients: parsed.excludedIngredients ?? defaults.excludedIngredients,
      language: parsed.language ?? defaults.language,
      notifications: { ...defaultNotifications, ...(parsed.notifications ?? {}) },
      onboardedAt: parsed.onboardedAt ?? null,
    };
  } catch {
    return defaults;
  }
}

/** Distinguishes "nothing loaded yet" from "loaded for the signed-out guest". */
const NOTHING_LOADED = Symbol('nothing-loaded');

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  // Settings are stored together with the account they belong to. Keeping the two
  // in one piece of state is what makes `ready` below safe: there is no render in
  // which we hold one user's settings while claiming to describe another's.
  const [loaded, setLoaded] = useState<{
    forUser: string | null | typeof NOTHING_LOADED;
    settings: Settings;
  }>({ forUser: NOTHING_LOADED, settings: defaults });

  // Derived during render, not stored. If this were state set from the effect
  // below, it would stay true for one render after the user changes — long
  // enough for the onboarding gate to read the previous account's (or the
  // signed-out guest's) empty settings and send a returning user through the
  // welcome flow. That is exactly what happened after a password reset, where
  // setActive() swaps guest → real user and navigates in the same tick.
  const localReady = loaded.forUser === userId;
  const settings = localReady ? loaded.settings : defaults;

  // The account's own answer to "has this person been onboarded". Device
  // storage can't answer it: a reinstall, a second phone, or a password reset
  // on a fresh device all produce an empty local record for an account that
  // finished onboarding months ago.
  const profile = useQuery(api.profile.getMine, userId ? {} : 'skip');
  const markOnboardedOnAccount = useMutation(api.profile.markOnboarded);
  const ensureProfile = useMutation(api.profile.ensureProfile);

  // Start the trial clock on the server the first time we see this account,
  // dated from the Clerk signup so an existing user isn't handed a fresh 21
  // days. Until this row exists the server errs on the side of access, so it
  // has to run early rather than at some later milestone.
  const accountCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : undefined;
  useEffect(() => {
    if (!userId) return;
    void ensureProfile({ accountCreatedAt }).catch(() => {
      // Offline. Retries next launch; access is unaffected meanwhile.
    });
  }, [userId, accountCreatedAt, ensureProfile]);

  const localOnboardedAt = settings.onboardedAt;
  const onboardedAt = localOnboardedAt ?? profile?.onboardedAt ?? null;

  // Backfill for everyone who onboarded before this record existed. Without it
  // they keep working on this phone and get the welcome flow again on the next
  // one, which is the bug this whole change is about.
  useEffect(() => {
    if (!userId || localOnboardedAt == null) return;
    if (profile === undefined || profile !== null) return; // loading, or already recorded
    void markOnboardedOnAccount({}).catch(() => {
      // Offline or a race with another device; it'll retry next launch.
    });
  }, [userId, localOnboardedAt, profile, markOnboardedOnAccount]);

  // Waiting on the server would stall every launch, so we only do it when the
  // device has nothing to say. A returning user on their usual phone is ready
  // immediately; only a genuinely unknown device pays for the round trip, and
  // that's the one case where being wrong means replaying onboarding.
  const ready = localReady && (localOnboardedAt != null || profile !== undefined);

  // Reload settings whenever the signed-in user changes (incl. sign-out → null).
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (active) setLoaded({ forUser: userId, settings: parseStored(raw) });
      })
      .catch(() => {
        if (active) setLoaded({ forUser: userId, settings: defaults });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const persist = useCallback(
    async (next: Settings) => {
      // Writing before the current account's settings have loaded would save
      // defaults over whatever is on disk. Callers are all user-initiated, so
      // this only trips during the brief post-sign-in window.
      if (!ready) return;
      setLoaded({ forUser: userId, settings: next });
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
    },
    [ready, userId],
  );

  const setAppearance = useCallback(
    async (appearance: Appearance) => {
      await persist({ ...settings, appearance });
    },
    [persist, settings],
  );

  const toggleDietary = useCallback(
    async (d: DietaryPreference) => {
      const has = settings.dietary.includes(d);
      const next = has ? settings.dietary.filter((x) => x !== d) : [...settings.dietary, d];
      await persist({ ...settings, dietary: next });
    },
    [persist, settings],
  );

  const toggleIntolerance = useCallback(
    async (i: Intolerance) => {
      const has = settings.intolerances.includes(i);
      const next = has
        ? settings.intolerances.filter((x) => x !== i)
        : [...settings.intolerances, i];
      await persist({ ...settings, intolerances: next });
    },
    [persist, settings],
  );

  const addExcludedIngredient = useCallback(
    async (name: string) => {
      const clean = name.trim().toLowerCase();
      if (!clean || settings.excludedIngredients.includes(clean)) return;
      await persist({
        ...settings,
        excludedIngredients: [...settings.excludedIngredients, clean],
      });
    },
    [persist, settings],
  );

  const removeExcludedIngredient = useCallback(
    async (name: string) => {
      await persist({
        ...settings,
        excludedIngredients: settings.excludedIngredients.filter((x) => x !== name),
      });
    },
    [persist, settings],
  );

  const setLanguage = useCallback(
    async (code: string) => {
      await persist({ ...settings, language: code });
    },
    [persist, settings],
  );

  const setNotifications = useCallback(
    async (next: Partial<NotificationPrefs>) => {
      await persist({
        ...settings,
        notifications: { ...settings.notifications, ...next },
      });
    },
    [persist, settings],
  );

  const markOnboarded = useCallback(async () => {
    const now = Date.now();
    await persist({ ...settings, onboardedAt: now });
    // Recorded on the account too, so the next device this person signs in on
    // doesn't start them over. A failure here is survivable — the local record
    // still works on this phone — so it must not block finishing onboarding.
    try {
      await markOnboardedOnAccount({});
    } catch {
      // ignore
    }
  }, [markOnboardedOnAccount, persist, settings]);

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      onboardedAt,
      ready,
      setAppearance,
      toggleDietary,
      toggleIntolerance,
      addExcludedIngredient,
      removeExcludedIngredient,
      setLanguage,
      setNotifications,
      markOnboarded,
    }),
    [
      settings,
      onboardedAt,
      ready,
      setAppearance,
      toggleDietary,
      toggleIntolerance,
      addExcludedIngredient,
      removeExcludedIngredient,
      setLanguage,
      setNotifications,
      markOnboarded,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
