import { useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/auth-gate';
import { clerkErrorMessage } from '@/lib/clerkErrors';
import { useSettings } from '@/providers/settings-provider';

const { width } = Dimensions.get('window');

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const slides: Slide[] = [
  {
    icon: 'sparkles',
    title: 'Welcome to Plinth',
    body: 'Discover thousands of recipes, plan your week, and shop smarter — all in one place.',
  },
  {
    icon: 'star',
    title: '21 days of Premium, on us',
    body: 'Browse by cuisine, get a daily pick, and try the dietitian plan free for 3 weeks. No card required.',
  },
  {
    icon: 'restaurant',
    title: 'Cook your way',
    body: 'Set dietary preferences, plan meals slot-by-slot, and pull ingredients into your shopping cart with one tap.',
  },
];

const TOTAL_PAGES = slides.length + 1; // 3 info + 1 photo

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
  const { markOnboarded } = useSettings();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (index < TOTAL_PAGES - 1) {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    }
  };

  const finish = async () => {
    await markOnboarded();
    router.replace('/');
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
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      await user.setProfileImage({ file: dataUrl });
    } catch (err) {
      Alert.alert('Upload failed', clerkErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPhotoPage = index === slides.length;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row justify-end px-5 pt-2">
        {!onPhotoPage && (
          <Pressable onPress={finish} hitSlop={12}>
            <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        className="flex-1">
        {slides.map((s) => (
          <View key={s.title} style={{ width }} className="flex-1 items-center justify-center px-8">
            <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-brand-500">
              <Ionicons name={s.icon} size={56} color="#ffffff" />
            </View>
            <Text className="text-center text-3xl font-bold text-neutral-900 dark:text-neutral-50">
              {s.title}
            </Text>
            <Text className="mt-3 text-center text-base leading-6 text-neutral-600 dark:text-neutral-400">
              {s.body}
            </Text>
          </View>
        ))}

        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-32 w-32 overflow-hidden rounded-full bg-brand-500">
            {user?.hasImage && user.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ height: '100%', width: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="person" size={64} color="#ffffff" />
              </View>
            )}
          </View>
          <Text className="text-center text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Add a profile picture
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-neutral-600 dark:text-neutral-400">
            Optional — add a photo so the app feels like yours. You can always change it later in
            Settings.
          </Text>
        </View>
      </ScrollView>

      <View className="px-8 pb-8">
        <View className="mb-6 flex-row justify-center gap-2">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${
                i === index ? 'w-8 bg-brand-500' : 'w-2 bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </View>

        {onPhotoPage ? (
          <View className="gap-3">
            <Pressable
              onPress={onUploadPhoto}
              disabled={photoBusy}
              className="items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
              {photoBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {user?.hasImage ? 'Change photo' : 'Upload a photo'}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={finish}
              className="items-center rounded-2xl border border-neutral-200 px-5 py-4 active:bg-neutral-100 dark:border-neutral-800 dark:active:bg-neutral-900">
              <Text className="text-base font-medium text-neutral-700 dark:text-neutral-300">
                {user?.hasImage ? "Let's cook" : 'Skip for now'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={goNext}
            className="items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80">
            <Text className="text-base font-semibold text-white">Next</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
