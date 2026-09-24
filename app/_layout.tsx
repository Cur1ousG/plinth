import '../global.css';

import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/offline-banner';
import { Colors } from '@/constants/theme';
import { convex } from '@/lib/convex';
import { configurePurchases, forgetPurchaser, identifyPurchaser } from '@/lib/purchases';
import { initSentry, setSentryUser, wrapRoot } from '@/lib/sentry';
import { tokenCache } from '@/lib/tokenCache';
import { AppDataProvider } from '@/providers/app-data-provider';
import { SettingsProvider, useSettings } from '@/providers/settings-provider';

// Single init point. Reads the DSN from env and no-ops when it's unset.
// See lib/sentry.ts for the privacy and sampling choices.
initSentry();
configurePurchases();

/**
 * Hold the splash screen until the app can actually draw something.
 *
 * Without this it hides the instant the native view mounts — before Clerk has
 * resolved a session, before settings have been read from storage, and before
 * the theme is applied. What you see is the splash, then a bare frame, then the
 * real screen snapping into place: three states in a few hundred milliseconds,
 * which reads as a glitch rather than a launch.
 *
 * The fade makes the handover a transition instead of a cut.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module isn't available. Not worth failing a launch.
});
SplashScreen.setOptions({ duration: 300, fade: true });

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
              <SplashGate />
              <IdentityTag />
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
 * Drops the splash once the first screen can render properly.
 *
 * `ready` means settings have been read and, for a device we've not seen
 * before, that the account's profile has come back — which is what decides
 * whether onboarding shows. Waiting for it is what stops the welcome flow
 * flashing up at someone who finished it months ago.
 *
 * The timeout is the important half. That profile lookup is a network call, and
 * a slow connection must not mean staring at a splash screen: after two and a
 * half seconds we show the app regardless and let it settle on its own.
 */
function SplashGate() {
  const { ready } = useSettings();

  useEffect(() => {
    const hide = () => {
      SplashScreen.hideAsync().catch(() => {});
    };
    if (ready) {
      hide();
      return;
    }
    const timer = setTimeout(hide, 2500);
    return () => clearTimeout(timer);
  }, [ready]);

  return null;
}

/**
 * Keeps Sentry's user context in sync with Clerk so crash reports can be grouped
 * per account. Sends only the opaque user id — never email or name.
 *
 * RevenueCat is tied to the same id here, for a less cosmetic reason: purchases
 * are keyed by whatever id the SDK holds, and the webhook rejects anonymous
 * ones. Getting this wrong means someone pays and is granted nothing.
 */
function IdentityTag() {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    setSentryUser(user?.id ?? null);
    if (user?.id) {
      void identifyPurchaser(user.id);
    } else {
      void forgetPurchaser();
    }
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
        <Stack.Screen name="import" options={{ title: 'Import a recipe' }} />
        <Stack.Screen name="recipe" options={{ headerShown: false }} />
        <Stack.Screen name="cuisine/[name]" />
        <Stack.Screen name="dietitian" />
        <Stack.Screen name="legal/privacy" options={{ title: 'Privacy policy' }} />
        <Stack.Screen name="legal/terms" options={{ title: 'Terms of service' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
    </ThemeProvider>
  );
}
