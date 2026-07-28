import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clerkErrorMessage } from '@/lib/clerkErrors';

type SecondFactorStrategy = 'totp' | 'phone_code' | 'backup_code' | 'email_code';

const SUPPORTED_STRATEGIES: SecondFactorStrategy[] = [
  'email_code',
  'phone_code',
  'totp',
  'backup_code',
];

function isSupportedStrategy(s: string): s is SecondFactorStrategy {
  return (SUPPORTED_STRATEGIES as string[]).includes(s);
}

/** Strategies where Clerk has to send the code before the user can enter it. */
type PreparableStrategy = Extract<SecondFactorStrategy, 'email_code' | 'phone_code'>;

/** totp and backup_code are read from something the user already has;
 *  email_code and phone_code have to be sent first. */
function needsPreparation(s: SecondFactorStrategy): s is PreparableStrategy {
  return s === 'email_code' || s === 'phone_code';
}

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
        const offered = attempt.supportedSecondFactors ?? [];
        const supported = offered
          .map((f) => f.strategy)
          .filter(isSupportedStrategy);

        if (supported.length === 0) {
          // Don't guess at a strategy — showing the wrong instructions is worse
          // than saying we can't handle it.
          const names = offered.map((f) => f.strategy).join(', ') || 'none reported';
          Alert.alert(
            'Unsupported verification',
            `This account requires a verification method this app can't handle yet (${names}). Sign in at ${'https://prepared-katydid-33.accounts.dev'} instead.`,
          );
          return;
        }

        const chosen = supported[0];
        setSupportedStrategies(supported);
        setMfaStrategy(chosen);
        setNeedsSecondFactor(true);

        // email_code / phone_code have to be requested before the user can type one.
        if (needsPreparation(chosen)) {
          try {
            await signIn.prepareSecondFactor({ strategy: chosen });
          } catch (err) {
            Alert.alert('Could not send code', clerkErrorMessage(err));
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
    if (needsPreparation(next) && signIn) {
      try {
        await signIn.prepareSecondFactor({ strategy: next });
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
            {strategyTitle(mfaStrategy)}
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

        <View className="mt-1 flex-row justify-end">
          <Link href="/forgot-password">
            <Text className="text-sm font-medium text-brand-600">Forgot password?</Text>
          </Link>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="mt-5 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
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
  if (s === 'email_code') return 'Email code';
  if (s === 'totp') return 'Authenticator app';
  if (s === 'phone_code') return 'Text message';
  return 'Backup code';
}

function strategyTitle(s: SecondFactorStrategy): string {
  if (s === 'email_code') return 'Check your email';
  if (s === 'phone_code') return 'Check your messages';
  return 'Two-factor required';
}

function strategyHelpText(s: SecondFactorStrategy): string {
  if (s === 'email_code')
    return "We've sent a verification code to your email address. Enter it below to finish signing in.";
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
