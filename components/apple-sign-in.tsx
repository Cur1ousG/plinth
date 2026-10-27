import { useSSO } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, useColorScheme } from 'react-native';

import { clerkErrorMessage } from '@/lib/clerkErrors';
import { REDIRECT_URL, useWarmUpBrowser } from '@/lib/sso';

/** "Continue with Apple", for both signing in and signing up. */
export function AppleSignInButton() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isDark = useColorScheme() === 'dark';

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, signUp, authSessionResult } = await startSSOFlow({
        strategy: 'oauth_apple',
        redirectUrl: REDIRECT_URL,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
        return;
      }

      // They closed the Apple sheet or pressed back. Not an error.
      if (authSessionResult && authSessionResult.type !== 'success') return;

      if (signUp?.status === 'missing_requirements') {
        const missing = signUp.missingFields.join(', ') || 'some details';
        Alert.alert(
          'Almost there',
          `Your account still needs: ${missing}. Sign up with email instead, or contact support.`,
        );
        return;
      }

      Alert.alert('Apple sign-in didn’t finish', 'Please try again.');
    } catch (err) {
      Alert.alert('Apple sign-in failed', clerkErrorMessage(err));
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
          <Ionicons name="logo-apple" size={20} color={isDark ? '#fafaf9' : '#000000'} />
          <Text className="ml-3 text-base font-semibold text-stone-900 dark:text-stone-50">
            Continue with Apple
          </Text>
        </>
      )}
    </Pressable>
  );
}