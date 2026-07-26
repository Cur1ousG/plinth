import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clerkErrorMessage } from '@/lib/clerkErrors';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);

  const startSignUp = async () => {
    if (!isLoaded || busy) return;
    if (!firstName.trim()) {
      Alert.alert('Enter your name', 'We’ll use it to personalize the app.');
      return;
    }
    setBusy(true);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      Alert.alert('Sign up failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!isLoaded || busy) return;
    const trimmed = code.replace(/\s+/g, '');
    if (trimmed.length === 0) {
      Alert.alert('Enter the code', 'Paste the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: trimmed });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        const missing = attempt.missingFields?.join(', ');
        Alert.alert(
          'Verification incomplete',
          missing
            ? `Clerk requires these fields before sign-up can complete: ${missing}. Either provide them in this form, or disable them in the Clerk Dashboard › User & Authentication › Email, Phone, Username.`
            : `Status: ${attempt.status}. Please try again.`,
        );
      }
    } catch (err) {
      Alert.alert('Verification failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {pendingVerification ? 'Verify your email' : 'Create your account'}
        </Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          {pendingVerification
            ? 'Enter the 6-digit code we sent to your email.'
            : 'Save recipes, build meal plans, and shop smarter.'}
        </Text>

        {pendingVerification ? (
          <Field
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
        ) : (
          <>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Field
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
                />
              </View>
            </View>
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
              autoComplete="password-new"
            />
          </>
        )}

        <Pressable
          onPress={pendingVerification ? verify : startSignUp}
          disabled={busy}
          className="mt-6 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {pendingVerification ? 'Verify' : 'Create account'}
            </Text>
          )}
        </Pressable>

        {!pendingVerification && (
          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
            </Text>
            <Link href="/sign-in">
              <Text className="text-sm font-semibold text-brand-600">Sign in</Text>
            </Link>
          </View>
        )}
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
