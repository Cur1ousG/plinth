import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Appearance = 'light' | 'dark' | 'system';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'glutenFree'
  | 'dairyFree'
  | 'ketogenic'
  | 'pescetarian';

export const DIETARY_OPTIONS: { id: DietaryPreference; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescetarian', label: 'Pescetarian' },
  { id: 'glutenFree', label: 'Gluten-free' },
  { id: 'dairyFree', label: 'Dairy-free' },
  { id: 'ketogenic', label: 'Keto' },
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
  language: string;
  notifications: NotificationPrefs;
  onboardedAt: number | null;
};

type Ctx = Settings & {
  ready: boolean;
  setAppearance: (a: Appearance) => Promise<void>;
  toggleDietary: (d: DietaryPreference) => Promise<void>;
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
  language: 'en',
  notifications: defaultNotifications,
  onboardedAt: null,
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);

  // Reload settings whenever the signed-in user changes (incl. sign-out → null).
  useEffect(() => {
    let active = true;
    setReady(false);
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<Settings>;
            setSettings({
              appearance: parsed.appearance ?? defaults.appearance,
              dietary: parsed.dietary ?? defaults.dietary,
              language: parsed.language ?? defaults.language,
              notifications: { ...defaultNotifications, ...(parsed.notifications ?? {}) },
              onboardedAt: parsed.onboardedAt ?? null,
            });
          } catch {
            setSettings(defaults);
          }
        } else {
          setSettings(defaults);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setSettings(defaults);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const persist = useCallback(
    async (next: Settings) => {
      setSettings(next);
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
    },
    [userId],
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
    await persist({ ...settings, onboardedAt: Date.now() });
  }, [persist, settings]);

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      ready,
      setAppearance,
      toggleDietary,
      setLanguage,
      setNotifications,
      markOnboarded,
    }),
    [settings, ready, setAppearance, toggleDietary, setLanguage, setNotifications, markOnboarded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
