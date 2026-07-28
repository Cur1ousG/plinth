import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clerkErrorMessage } from '@/lib/clerkErrors';

const MIN_PASSWORD_LENGTH = 8;

type Stage = 'request' | 'reset';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  /** Stage 1 — ask Clerk to email a reset code. */
  const onRequestCode = async () => {
    if (!isLoaded || busy) return;
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Enter your email', 'We need your email address to send a reset code.');
      return;
    }
    setBusy(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: trimmed,
      });
      setStage('reset');
    } catch (err) {
      Alert.alert('Could not send code', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** Stage 2 — verify the code and set the new password in one call. */
  const onResetPassword = async () => {
    if (!isLoaded || busy) return;

    const trimmedCode = code.replace(/\s+/g, '');
    if (!trimmedCode) {
      Alert.alert('Enter the code', 'Paste the code we emailed you.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'Password too short',
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords don’t match', 'Re-type your new password to confirm.');
      return;
    }

    setBusy(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: trimmedCode,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
        return;
      }

      if (result.status === 'needs_second_factor') {
        // Password is already changed at this point — they just can't be signed
        // in automatically because the account has two-factor enabled.
        Alert.alert(
          'Password changed',
          'Your password has been updated. Sign in with it to continue — you’ll be asked for your second factor.',
          [{ text: 'OK', onPress: () => router.replace('/sign-in') }],
        );
        return;
      }

      Alert.alert('Reset incomplete', `Status: ${result.status}. Please try again.`);
    } catch (err) {
      Alert.alert('Reset failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      Alert.alert('Code resent', `We've sent a new code to ${email.trim()}.`);
    } catch (err) {
      Alert.alert('Could not resend', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {stage === 'request' ? 'Reset your password' : 'Check your email'}
        </Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          {stage === 'request'
            ? "Enter the email on your account and we'll send you a code to set a new password."
            : `We've sent a code to ${email.trim()}. Enter it below along with your new password.`}
        </Text>

        {stage === 'request' ? (
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        ) : (
          <>
            <Field
              label="Reset code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="password-new"
            />
            <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              At least {MIN_PASSWORD_LENGTH} characters.
            </Text>
          </>
        )}

        <Pressable
          onPress={stage === 'request' ? onRequestCode : onResetPassword}
          disabled={busy}
          className="mt-6 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {stage === 'request' ? 'Send reset code' : 'Set new password'}
            </Text>
          )}
        </Pressable>

        {stage === 'reset' && (
          <Pressable onPress={onResendCode} disabled={busy} className="mt-4 items-center">
            <Text className="text-sm text-brand-600">Didn&apos;t get it? Resend code</Text>
          </Pressable>
        )}

        <View className="mt-8 flex-row justify-center">
          <Link href="/sign-in">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              ← Back to sign in
            </Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
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
