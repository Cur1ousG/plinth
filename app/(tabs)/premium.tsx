import { useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from 'convex/react';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/convex/_generated/api';
import { useEntitlement, type Entitlement } from '@/hooks/useEntitlement';
import { convex } from '@/lib/convex';
import { getVariantId } from '@/lib/lemonsqueezy';

const perks: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
  {
    icon: 'globe',
    title: 'Dishes by region',
    desc: 'Browse recipes filtered by cuisine and country, right on your home tab.',
  },
  {
    icon: 'calendar',
    title: 'Dish for the day',
    desc: 'Get a hand-picked recipe each day, delivered automatically.',
  },
  {
    icon: 'nutrition',
    title: 'Dietitian plan',
    desc: 'Macros, calories, and meal plans tuned for cutting, bulking, or maintenance.',
  },
];

export default function PremiumScreen() {
  const entitlement = useEntitlement();
  const { tier } = entitlement;
  const { user, isSignedIn } = useUser();
  const sub = useQuery(api.subscriptions.getMyStatus, isSignedIn ? {} : 'skip');

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);

  const onSubscribe = async () => {
    if (!user || checkoutBusy) return;
    const variantId = getVariantId();
    if (!variantId) {
      Alert.alert(
        'Checkout not configured',
        'Set EXPO_PUBLIC_LEMONSQUEEZY_VARIANT_ID in .env, then restart Metro with -c.',
      );
      return;
    }
    setCheckoutBusy(true);
    try {
      const { url } = await convex.action(api.lemonsqueezy.createCheckoutSession, {
        variantId,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      });
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert('Could not start checkout', err instanceof Error ? err.message : 'Unknown');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const onCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      "You'll keep access until the end of your current billing period. After that, premium features will be locked.",
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setManageBusy(true);
            try {
              await convex.action(api.lemonsqueezy.cancelSubscription, {});
            } catch (err) {
              Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Unknown');
            } finally {
              setManageBusy(false);
            }
          },
        },
      ],
    );
  };

  const onResume = async () => {
    setManageBusy(true);
    try {
      await convex.action(api.lemonsqueezy.resumeSubscription, {});
    } catch (err) {
      Alert.alert('Could not resume', err instanceof Error ? err.message : 'Unknown');
    } finally {
      setManageBusy(false);
    }
  };

  const onOpenBillingPortal = async () => {
    const portalUrl = sub?.customerPortalUrl ?? sub?.updatePaymentMethodUrl;
    if (!portalUrl) {
      Alert.alert(
        'Billing portal unavailable',
        "Your billing portal link is provided by Lemon Squeezy after your first webhook event. Once your store is activated, this opens a page where you can update your card and download invoices.",
      );
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(portalUrl);
    } catch (err) {
      Alert.alert('Could not open portal', err instanceof Error ? err.message : 'Unknown');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="px-5 pt-2 pb-10">
        <Hero entitlement={entitlement} />

        <View className="my-6 gap-3">
          {perks.map((p) => (
            <Perk key={p.title} {...p} />
          ))}
        </View>

        {(tier === 'trial' || tier === 'premium') && (
          <Link href="/dietitian" asChild>
            <Pressable className="mb-3 flex-row items-center justify-between rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80">
              <View>
                <Text className="text-base font-semibold text-white">Open dietitian plan</Text>
                <Text className="text-xs text-brand-100">
                  Set your goal and get tailored macros
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </Pressable>
          </Link>
        )}

        {tier === 'premium' ? (
          <ManageSection
            entitlement={entitlement}
            busy={manageBusy}
            onCancel={onCancel}
            onResume={onResume}
            onOpenBillingPortal={onOpenBillingPortal}
          />
        ) : (
          <SubscribeCTA tier={tier} ready={entitlement.ready} busy={checkoutBusy} onPress={onSubscribe} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero({ entitlement }: { entitlement: Entitlement }) {
  const { tier, daysRemaining, expiresAt, cancelled } = entitlement;

  if (tier === 'premium') {
    const date = expiresAt ? formatDate(expiresAt) : '';
    return (
      <View className="rounded-3xl bg-brand-500 p-6">
        <Ionicons
          name={cancelled ? 'warning' : 'checkmark-circle'}
          size={32}
          color="#ffffff"
        />
        <Text className="mt-3 text-3xl font-bold text-white">
          {cancelled ? 'Cancelled' : "You're Premium"}
        </Text>
        <Text className="mt-2 text-base text-brand-100">
          {cancelled
            ? `Premium access ends ${date}. Resume anytime before then to keep your subscription active.`
            : `All features unlocked. Renews ${date}.`}
        </Text>
      </View>
    );
  }

  if (tier === 'trial') {
    return (
      <View className="rounded-3xl bg-brand-500 p-6">
        <Ionicons name="sparkles" size={32} color="#ffffff" />
        <Text className="mt-3 text-3xl font-bold text-white">Your free trial is on</Text>
        <Text className="mt-2 text-base text-brand-100">
          {daysRemaining} day{daysRemaining === 1 ? '' : 's'} of premium remaining. Subscribe before
          the trial ends to keep these features.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-3xl bg-brand-500 p-6">
      <Ionicons name="star" size={32} color="#ffffff" />
      <Text className="mt-3 text-3xl font-bold text-white">Plinth Premium</Text>
      <Text className="mt-2 text-base text-brand-100">
        Unlock smarter cooking with personalized plans and richer discovery.
      </Text>
    </View>
  );
}

function Perk({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View className="flex-row rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <Ionicons name={icon} size={20} color="#ea580c" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{desc}</Text>
      </View>
    </View>
  );
}

function SubscribeCTA({
  tier,
  ready,
  busy,
  onPress,
}: {
  tier: 'free' | 'trial' | 'premium';
  ready: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  if (!ready && tier === 'free') {
    return (
      <View className="rounded-2xl border border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <Text className="text-center text-sm text-neutral-500">Loading…</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-center text-base font-semibold text-white">
          {tier === 'trial' ? 'Subscribe to keep premium' : 'Subscribe'}
        </Text>
      )}
    </Pressable>
  );
}

function ManageSection({
  entitlement,
  busy,
  onCancel,
  onResume,
  onOpenBillingPortal,
}: {
  entitlement: Entitlement;
  busy: boolean;
  onCancel: () => void;
  onResume: () => void;
  onOpenBillingPortal: () => void;
}) {
  const { cancelled } = entitlement;
  return (
    <View className="gap-3">
      {cancelled ? (
        <Pressable
          onPress={onResume}
          disabled={busy}
          className="rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Resume subscription
            </Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onCancel}
          disabled={busy}
          className="rounded-2xl border border-red-300 px-5 py-4 active:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:active:bg-red-950">
          {busy ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text className="text-center text-base font-medium text-red-600">
              Cancel subscription
            </Text>
          )}
        </Pressable>
      )}

      <Pressable
        onPress={onOpenBillingPortal}
        className="flex-row items-center justify-between rounded-2xl border border-neutral-200 px-5 py-4 active:bg-neutral-100 dark:border-neutral-800 dark:active:bg-neutral-900">
        <View>
          <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
            Billing & invoices
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Update card, download receipts
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#737373" />
      </Pressable>
    </View>
  );
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
