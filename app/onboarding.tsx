import { useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/auth-gate';
import { clerkErrorMessage } from '@/lib/clerkErrors';
import {
  DIETARY_OPTIONS,
  INTOLERANCE_OPTIONS,
  useSettings,
  type DietaryPreference,
  type Intolerance,
} from '@/providers/settings-provider';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  return (
    <AuthGate>
      <OnboardingInner />
    </AuthGate>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const { user } = useUser();
  const {
    dietary,
    intolerances,
    toggleDietary,
    toggleIntolerance,
    markOnboarded,
    onboardedAt,
    ready,
  } = useSettings();

  const [step, setStep] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Wait for this account's settings before showing anything. Rendering the
  // welcome copy against unloaded settings is how someone who has used the app
  // for months ends up being greeted as brand new.
  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    );
  }

  // Reached by a returning user — nothing to onboard.
  if (onboardedAt) {
    return <Redirect href="/" />;
  }

  const finish = async () => {
    await markOnboarded();
    router.replace('/');
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else void finish();
  };

  const onUploadPhoto = async () => {
    if (!user || photoBusy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]?.base64) return;

    setPhotoBusy(true);
    try {
      const asset = picked.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      await user.setProfileImage({ file: `data:${mime};base64,${asset.base64}` });
    } catch (err) {
      Alert.alert('Upload failed', clerkErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const restrictionCount = dietary.length + intolerances.length;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Segmented progress — tells people how much is left, which keeps them going. */}
      <View className="flex-row gap-1.5 px-6 pt-3">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? 'bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-800'
            }`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between px-6 pt-3">
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#737373" />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Pressable onPress={finish} hitSlop={12}>
          <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-6"
        showsVerticalScrollIndicator={false}>
        {step === 0 && <WelcomeStep />}

        {step === 1 && (
          <FoodStep
            dietary={dietary}
            intolerances={intolerances}
            onToggleDiet={toggleDietary}
            onToggleIntolerance={toggleIntolerance}
          />
        )}

        {step === 2 && <PhotoStep user={user} busy={photoBusy} onUpload={onUploadPhoto} />}
      </ScrollView>

      <View className="px-6 pb-8 pt-2">
        <Pressable
          onPress={next}
          className="items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80">
          <Text className="text-base font-semibold text-white">
            {step === 0 && 'Get started'}
            {step === 1 && (restrictionCount > 0 ? 'Continue' : 'No restrictions — continue')}
            {step === 2 && "Let's cook"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */

function WelcomeStep() {
  return (
    <View className="pt-10">
      <View className="mb-8 h-24 w-24 items-center justify-center rounded-3xl bg-brand-500">
        <Ionicons name="restaurant" size={48} color="#ffffff" />
      </View>

      <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
        Welcome to Plinth
      </Text>
      <Text className="mt-3 text-lg leading-7 text-neutral-600 dark:text-neutral-400">
        Find recipes you&apos;ll actually make, plan them across the week, and walk into the shop
        knowing exactly what to buy.
      </Text>

      <View className="mt-8 gap-4">
        <Highlight
          icon="sparkles"
          title="Premium free for 21 days"
          body="Browse by cuisine, get a daily pick, and try the dietitian plan. No card needed."
        />
        <Highlight
          icon="hand-left"
          title="Two quick questions"
          body="Tell us how you eat and we'll filter every recipe to match. Takes about 30 seconds."
        />
      </View>
    </View>
  );
}

function Highlight({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row">
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <Ionicons name={icon} size={20} color="#ea580c" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </Text>
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{body}</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The step that earns onboarding its place. Whatever is selected here flows
 * straight into every recipe query the app makes — Discover, the home rails,
 * cuisine browsing, and the dietitian plan. Previously this lived only in
 * Settings, where most people would never have found it.
 */
function FoodStep({
  dietary,
  intolerances,
  onToggleDiet,
  onToggleIntolerance,
}: {
  dietary: DietaryPreference[];
  intolerances: Intolerance[];
  onToggleDiet: (d: DietaryPreference) => void;
  onToggleIntolerance: (i: Intolerance) => void;
}) {
  return (
    <View className="pt-8">
      <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
        How do you eat?
      </Text>
      <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
        We&apos;ll filter every recipe to match. You can change this any time in Settings.
      </Text>

      <Text className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Diet
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {DIETARY_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            active={dietary.includes(opt.id)}
            onPress={() => onToggleDiet(opt.id)}
          />
        ))}
      </View>

      <Text className="mb-1 mt-8 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Allergies &amp; intolerances
      </Text>
      <Text className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        Recipes containing these are hidden completely, not just ranked lower.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {INTOLERANCE_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            active={intolerances.includes(opt.id)}
            onPress={() => onToggleIntolerance(opt.id)}
          />
        ))}
      </View>

      <Text className="mt-6 text-xs text-neutral-400 dark:text-neutral-600">
        Recipe data comes from third parties, so always check ingredients yourself before cooking.
      </Text>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full border px-4 py-2.5 ${
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      }`}>
      {active && (
        <Ionicons name="checkmark" size={15} color="#ea580c" style={{ marginRight: 4 }} />
      )}
      <Text
        className={`text-sm ${
          active
            ? 'font-semibold text-brand-700 dark:text-brand-100'
            : 'text-neutral-700 dark:text-neutral-300'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

function PhotoStep({
  user,
  busy,
  onUpload,
}: {
  user: ReturnType<typeof useUser>['user'];
  busy: boolean;
  onUpload: () => void;
}) {
  return (
    <View className="items-center pt-14">
      <Pressable onPress={onUpload} disabled={busy}>
        <View className="h-32 w-32 overflow-hidden rounded-full bg-brand-500">
          {user?.hasImage && user.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ height: '100%', width: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="camera" size={44} color="#ffffff" />
            </View>
          )}
        </View>
      </Pressable>

      <Text className="mt-8 text-center text-3xl font-bold text-neutral-900 dark:text-neutral-50">
        Add a photo
      </Text>
      <Text className="mt-2 text-center text-base text-neutral-600 dark:text-neutral-400">
        Optional — it just makes the app feel like yours.
      </Text>

      <Pressable
        onPress={onUpload}
        disabled={busy}
        className="mt-6 rounded-2xl border border-neutral-200 px-6 py-3 active:bg-neutral-100 disabled:opacity-60 dark:border-neutral-800 dark:active:bg-neutral-900">
        {busy ? (
          <ActivityIndicator color="#f97316" />
        ) : (
          <Text className="text-base font-medium text-brand-600">
            {user?.hasImage ? 'Change photo' : 'Choose a photo'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
