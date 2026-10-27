import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Where the OAuth providers send people back to, pinned so it's identical on
 * every kind of build. This is the exact string to allowlist in Clerk, for
 * both iOS and Android.
 */
export const REDIRECT_URL = AuthSession.makeRedirectUri({ scheme: 'plinth', path: 'sso-callback' });

// Lets the browser tab close itself and hand the result back when the flow
// ends on web. A no-op on native, where openAuthSessionAsync already does it.
WebBrowser.maybeCompleteAuthSession();

/**
 * Android starts a fresh Custom Tab on every sign-in unless it's been warmed
 * up. Both calls swallow their errors: warming up is an optimisation, not a
 * requirement, and devices without a Custom Tabs-capable browser throw.
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);
}