import '../global.css';

import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/offline-banner';
import { Colors } from '@/constants/theme';
import { convex } from '@/lib/convex';
import { initSentry, setSentryUser, wrapRoot } from '@/lib/sentry';
import { tokenCache } from '@/lib/tokenCache';
import { AppDataProvider } from '@/providers/app-data-provider';
import { SettingsProvider, useSettings } from '@/providers/settings-provider';

// Single init point. Reads the DSN from env and no-ops when it's unset.
// See lib/sentry.ts for the privacy and sampling choices.
initSentry();

export const unstable_settings = {
  anchor: '(tabs)',
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in .env at the project root.',
  );
}

function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <SettingsProvider>
            <AppDataProvider>
              <SentryUserTag />
              <ThemedShell />
            </AppDataProvider>
          </SettingsProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default wrapRoot(RootLayout);

/**
 * Keeps Sentry's user context in sync with Clerk so crash reports can be grouped
 * per account. Sends only the opaque user id — never email or name.
 */
function SentryUserTag() {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    setSentryUser(user?.id ?? null);
  }, [isLoaded, user?.id]);
  return null;
}

/**
 * React Navigation paints the screen behind our views — stack headers, the card
 * underneath a push transition, the gap during a gesture. Its stock themes are
 * cool greys, so leaving them alone would show a slice of #f2f2f2 or #121212
 * around every warm screen. These extend the stock themes rather than replacing
 * them so we inherit fonts and any future keys.
 */
const navThemeLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const navThemeDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

function ThemedShell() {
  const { appearance } = useSettings();
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativewindColorScheme();

  const effective: 'light' | 'dark' =
    appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  useEffect(() => {
    setColorScheme(appearance);
  }, [appearance, setColorScheme]);

  return (
    <ThemeProvider value={effective === 'dark' ? navThemeDark : navThemeLight}>
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="your-recipes" options={{ title: 'Your Recipes' }} />
        <Stack.Screen name="shopping-cart" options={{ title: 'Shopping Cart' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Stack.Screen name="settings/account" options={{ title: 'Account' }} />
        <Stack.Screen name="settings/food" options={{ title: 'Food preferences' }} />
        <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="settings/language" options={{ title: 'Language' }} />
        <Stack.Screen name="settings/display" options={{ title: 'Display' }} />
        <Stack.Screen name="recipe" options={{ headerShown: false }} />
        <Stack.Screen name="cuisine/[name]" />
        <Stack.Screen name="dietitian" />
        <Stack.Screen name="legal/privacy" options={{ title: 'Privacy policy' }} />
        <Stack.Screen name="legal/terms" options={{ title: 'Terms of service' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
    </ThemeProvider>
  );
}
