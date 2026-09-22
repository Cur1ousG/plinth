import { useSSO } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { clerkErrorMessage } from '@/lib/clerkErrors';

/**
 * Where Google sends people back to, pinned so it's identical on every kind of
 * build. Left to default, a development build can generate it with the dev
 * client's own scheme rather than `plinth://`, and Clerk rejects any address
 * that isn't on its allowlist. This is the exact string to allowlist in Clerk,
 * for both iOS and Android.
 */
const REDIRECT_URL = AuthSession.makeRedirectUri({ scheme: 'plinth', path: 'sso-callback' });

// Lets the browser tab close itself and hand the result back when the flow
// ends on web. A no-op on native, where openAuthSessionAsync already does it.
WebBrowser.maybeCompleteAuthSession();

/**
 * Android starts a fresh Custom Tab on every sign-in unless it's been warmed
 * up, which reads as a noticeable pause after tapping the button.
 */
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

/**
 * "Continue with Google", for both signing in and signing up.
 *
 * One button covers both because Google sign-in doesn't distinguish them:
 * Clerk signs you in if the Google account is known, creates the account if
 * it isn't, and links it to an existing email-and-password account with the
 * same verified address. So there's no "which screen am I on" to get wrong.
 *
 * Onboarding needs nothing special here. A brand-new Google account has no
 * profile row, so the tabs' onboarding gate sends it through the welcome flow;
 * a returning one has onboardedAt on the account and goes straight in.
 */
export function GoogleSignInButton() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, signUp, authSessionResult } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: REDIRECT_URL,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
        return;
      }

      // They closed the Google sheet or pressed back. Not an error.
      if (authSessionResult && authSessionResult.type !== 'success') return;

      // Clerk wants something Google didn't supply — only possible if the
      // instance is configured to require extra sign-up fields. Say which,
      // rather than failing silently.
      if (signUp?.status === 'missing_requirements') {
        const missing = signUp.missingFields.join(', ') || 'some details';
        Alert.alert(
          'Almost there',
          `Your account still needs: ${missing}. Sign up with email instead, or contact support.`,
        );
        return;
      }

      Alert.alert('Google sign-in didn’t finish', 'Please try again.');
    } catch (err) {
      Alert.alert('Google sign-in failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-row items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-4 active:opacity-80 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900">
      {busy ? (
        <ActivityIndicator color="#78716c" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text className="ml-3 text-base font-semibold text-stone-900 dark:text-stone-50">
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function OrDivider() {
  return (
    <View className="my-6 flex-row items-center">
      <View className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      <Text className="mx-3 text-xs text-stone-400 dark:text-stone-500">or</Text>
      <View className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
    </View>
  );
}
