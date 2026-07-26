import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clerkErrorMessage } from '@/lib/clerkErrors';

type SecondFactorStrategy = 'totp' | 'phone_code' | 'backup_code';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Second factor state
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [mfaStrategy, setMfaStrategy] = useState<SecondFactorStrategy>('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [supportedStrategies, setSupportedStrategies] = useState<SecondFactorStrategy[]>([]);

  const onSubmit = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
        return;
      }
      if (attempt.status === 'needs_second_factor') {
        const supported = (attempt.supportedSecondFactors ?? [])
          .map((f) => f.strategy as SecondFactorStrategy)
          .filter((s): s is SecondFactorStrategy =>
            s === 'totp' || s === 'phone_code' || s === 'backup_code',
          );
        setSupportedStrategies(supported.length > 0 ? supported : ['totp']);
        setMfaStrategy(supported[0] ?? 'totp');
        setNeedsSecondFactor(true);

        // If the chosen strategy is phone_code, send the SMS now.
        if (supported[0] === 'phone_code') {
          try {
            await signIn.prepareSecondFactor({ strategy: 'phone_code' });
          } catch {
            // user can retry from the form
          }
        }
        return;
      }
      Alert.alert('Sign in incomplete', `Status: ${attempt.status}. Additional verification is required.`);
    } catch (err) {
      Alert.alert('Sign in failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onVerifyMfa = async () => {
    if (!isLoaded || busy) return;
    const trimmed = mfaCode.replace(/\s+/g, '');
    if (!trimmed) {
      Alert.alert('Enter the code', 'Type the verification code to continue.');
      return;
    }
    setBusy(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: mfaStrategy,
        code: trimmed,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Verification incomplete', `Status: ${result.status}.`);
      }
    } catch (err) {
      Alert.alert('Verification failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSwitchStrategy = async (next: SecondFactorStrategy) => {
    setMfaStrategy(next);
    setMfaCode('');
    if (next === 'phone_code' && signIn) {
      try {
        await signIn.prepareSecondFactor({ strategy: 'phone_code' });
      } catch (err) {
        Alert.alert('Could not send code', clerkErrorMessage(err));
      }
    }
  };

  if (needsSecondFactor) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <View className="flex-1 justify-center px-6">
          <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Two-factor required
          </Text>
          <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
            {strategyHelpText(mfaStrategy)}
          </Text>

          <Field
            label="Verification code"
            value={mfaCode}
            onChangeText={setMfaCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />

          <Pressable
            onPress={onVerifyMfa}
            disabled={busy}
            className="mt-6 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Verify and continue</Text>
            )}
          </Pressable>

          {supportedStrategies.length > 1 && (
            <View className="mt-6">
              <Text className="mb-2 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Try another method
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {supportedStrategies
                  .filter((s) => s !== mfaStrategy)
                  .map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => onSwitchStrategy(s)}
                      className="rounded-full border border-neutral-200 px-4 py-2 active:bg-neutral-100 dark:border-neutral-800 dark:active:bg-neutral-900">
                      <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                        {strategyLabel(s)}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          )}

          <Pressable
            onPress={() => {
              setNeedsSecondFactor(false);
              setMfaCode('');
            }}
            className="mt-6 items-center">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              ← Back to email + password
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Welcome back
        </Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          Sign in to sync your recipes and meal plans.
        </Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="mt-6 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Sign in</Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            Don&apos;t have an account?{' '}
          </Text>
          <Link href="/sign-up">
            <Text className="text-sm font-semibold text-brand-600">Sign up</Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

function strategyLabel(s: SecondFactorStrategy): string {
  if (s === 'totp') return 'Authenticator app';
  if (s === 'phone_code') return 'Text message';
  return 'Backup code';
}

function strategyHelpText(s: SecondFactorStrategy): string {
  if (s === 'totp')
    return 'Open your authenticator app (Google Authenticator, 1Password, etc.) and enter the 6-digit code shown for Plinth.';
  if (s === 'phone_code')
    return "We've sent a code to the phone number on your account. Enter it below.";
  return 'Enter one of the backup codes you saved when you set up two-factor.';
}

function Field({
  label,
  ...input
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </Text>
      <TextInput
        {...input}
        placeholderTextColor="#737373"
        className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
      />
    </View>
  );
}
