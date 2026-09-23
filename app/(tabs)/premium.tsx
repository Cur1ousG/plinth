import { useUser } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { useEntitlement, type Entitlement } from "@/hooks/useEntitlement";
import {
  PurchaseCancelled,
  describeError,
  getPlans,
  openPlaySubscriptions,
  purchasePlan,
  plansDiagnostic,
  purchasesEnabled,
  restorePurchases,
  type Plans,
} from "@/lib/purchases";

type BillingPeriod = "monthly" | "annual";

// Import leads deliberately. The other three are all discovery, which free
// users already get plenty of; import is the one that makes Plinth the place
// someone's cooking lives, and it's what this category actually charges for.
const perks: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    icon: "link",
    title: "Import any recipe",
    desc: "Paste a link from any recipe site, or the caption from an Instagram reel, and Plinth pulls out the ingredients and steps.",
  },
  {
    icon: "globe",
    title: "Dishes by region",
    desc: "Browse recipes filtered by cuisine and country, right on your home tab.",
  },
  {
    icon: "calendar",
    title: "Dish for the day",
    desc: "Get a hand-picked recipe each day, delivered automatically.",
  },
  {
    icon: "nutrition",
    title: "Dietitian plan",
    desc: "Macros, calories, and meal plans tuned for cutting, bulking, or maintenance.",
  },
];

export default function PremiumScreen() {
  const entitlement = useEntitlement();
  const { tier } = entitlement;
  const { user, isSignedIn } = useUser();
  const sub = useQuery(api.subscriptions.getMyStatus, isSignedIn ? {} : "skip");

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  // Annual is preselected: it's better value for the user and better cash flow
  // for us, and people rarely switch off a sensible default.
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const [manageBusy, setManageBusy] = useState(false);
  const [plans, setPlans] = useState<Plans | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Prices come from Play rather than from a constant in the app. Play converts
  // and localises them per country, so a hardcoded rand figure would be wrong
  // for everyone outside South Africa — and a price that disagrees with the one
  // on Google's sheet is how you earn a chargeback.
  useEffect(() => {
    let cancelled = false;
    getPlans()
      .then((p) => {
        if (!cancelled) setPlans(p);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPlans({ monthly: null, annual: null });
        setPlansError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubscribe = async () => {
    if (!user || checkoutBusy) return;
    if (!purchasesEnabled) {
      Alert.alert(
        "Checkout unavailable",
        "This build has no billing key. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY and rebuild.",
      );
      return;
    }
    const pkg = period === "annual" ? plans?.annual : plans?.monthly;
    if (!pkg) {
      // Say why. On a release build this alert is the only window into it.
      Alert.alert(
        "Plans unavailable",
        plansError ??
          plansDiagnostic ??
          "Couldn't reach the Play Store. Check your connection and try again.",
      );
      return;
    }
    setCheckoutBusy(true);
    try {
      await purchasePlan(pkg);
      // The webhook is what actually grants access; this only tells the person
      // the purchase landed. Their entitlement updates when Convex does, which
      // is typically within a second or two of Google confirming.
      Alert.alert(
        "Welcome to Premium",
        "Your subscription is active. It may take a moment to appear.",
      );
    } catch (err) {
      // Backing out of Google's sheet is a normal thing to do, not an error.
      if (err instanceof PurchaseCancelled) return;
      Alert.alert("Purchase failed", describeError(err));
    } finally {
      setCheckoutBusy(false);
    }
  };

  /**
   * Reinstalls and new devices need this: Play remembers the purchase against
   * the Google account, but our backend only knows what a webhook told it, and
   * it may never have seen one for this account on this install.
   */
  const onRestore = useCallback(async () => {
    setManageBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? "Purchases restored" : "Nothing to restore",
        restored
          ? "Your subscription is active again."
          : "No active subscription was found for this Google account.",
      );
    } catch (err) {
      Alert.alert(
        "Could not restore",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setManageBusy(false);
    }
  }, []);

  /**
   * Cancelling, resuming and changing a card all happen in Play, not here.
   *
   * There is no API to cancel a Play subscription on the user's behalf — Google
   * owns that screen deliberately, so nobody can be talked out of leaving by an
   * app's own retention flow. Deep-linking to the right subscription is the
   * most we can do, and it is also what Google's policy expects us to do.
   */
  const onManageInPlay = async () => {
    try {
      await openPlaySubscriptions(sub?.plan);
    } catch (err) {
      Alert.alert(
        "Could not open Play",
        err instanceof Error ? err.message : "Unknown",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
      <ScrollView contentContainerClassName="px-5 pt-2 pb-10">
        <Hero entitlement={entitlement} />

        <View className="my-6 gap-3">
          {perks.map((p) => (
            <Perk key={p.title} {...p} />
          ))}
        </View>

        {(tier === "trial" || tier === "premium") && (
          <Link href="/dietitian" asChild>
            <Pressable className="mb-3 flex-row items-center justify-between rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80">
              <View>
                <Text className="text-base font-semibold text-white">
                  Open dietitian plan
                </Text>
                <Text className="text-xs text-brand-100">
                  Set your goal and get tailored macros
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </Pressable>
          </Link>
        )}

        {tier === "premium" ? (
          <ManageSection
            busy={manageBusy}
            onManageInPlay={onManageInPlay}
            onRestore={onRestore}
          />
        ) : (
          <>
            <PlanPicker selected={period} onSelect={setPeriod} plans={plans} />
            <SubscribeCTA
              tier={tier}
              ready={entitlement.ready}
              busy={checkoutBusy}
              onPress={onSubscribe}
            />
            <Pressable
              onPress={onRestore}
              disabled={manageBusy}
              className="mt-3 py-2"
            >
              <Text className="text-center text-sm text-stone-500 dark:text-stone-400">
                Already subscribed? Restore purchase
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero({ entitlement }: { entitlement: Entitlement }) {
  const { tier, daysRemaining, expiresAt, cancelled } = entitlement;

  if (tier === "premium") {
    const date = expiresAt ? formatDate(expiresAt) : "";
    return (
      <View className="rounded-3xl bg-brand-500 p-6">
        <Ionicons
          name={cancelled ? "warning" : "checkmark-circle"}
          size={32}
          color="#ffffff"
        />
        <Text className="mt-3 text-3xl font-bold text-white">
          {cancelled ? "Cancelled" : "You're Premium"}
        </Text>
        <Text className="mt-2 text-base text-brand-100">
          {cancelled
            ? `Premium access ends ${date}. Resume anytime before then to keep your subscription active.`
            : `All features unlocked. Renews ${date}.`}
        </Text>
      </View>
    );
  }

  if (tier === "trial") {
    return (
      <View className="rounded-3xl bg-brand-500 p-6">
        <Ionicons name="sparkles" size={32} color="#ffffff" />
        <Text className="mt-3 text-3xl font-bold text-white">
          Your free trial is on
        </Text>
        <Text className="mt-2 text-base text-brand-100">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} of premium
          remaining. Subscribe before the trial ends to keep these features.
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
    <View className="flex-row rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <Ionicons name={icon} size={20} color="#ea580c" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-stone-900 dark:text-stone-50">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {desc}
        </Text>
      </View>
    </View>
  );
}

/**
 * Shows the price before anyone commits. Previously the first time a person saw
 * what Plinth cost was the Lemon Squeezy page after tapping Subscribe, which
 * loses people and is not what app stores expect of a paid feature.
 */
/** Static copy only. Every price on this screen comes from the store. */
const PLAN_COPY: Record<
  BillingPeriod,
  { label: string; caption: string; badge?: string }
> = {
  monthly: { label: "Monthly", caption: "Billed every month" },
  annual: {
    label: "Yearly",
    caption: "Billed once a year",
    badge: "2 MONTHS FREE",
  },
};

function PlanPicker({
  selected,
  onSelect,
  plans,
}: {
  selected: BillingPeriod;
  onSelect: (p: BillingPeriod) => void;
  plans: Plans | null;
}) {
  return (
    <View className="mb-3 flex-row gap-3">
      {(["annual", "monthly"] as BillingPeriod[]).map((p) => {
        const plan = PLAN_COPY[p];
        const pkg = p === "annual" ? plans?.annual : plans?.monthly;
        // Play's own localised string — "R129.99", "$6.99", "₹499" — rather
        // than a figure we'd have to keep in step with the console by hand.
        const price = pkg?.product.priceString ?? "—";
        const active = selected === p;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            className={`flex-1 rounded-2xl border p-4 active:opacity-80 ${
              active
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900"
                : "border-stone-200 dark:border-stone-800"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text
                className={`text-sm font-semibold ${
                  active
                    ? "text-brand-700 dark:text-brand-100"
                    : "text-stone-700 dark:text-stone-300"
                }`}
              >
                {plan.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
              ) : null}
            </View>
            <Text className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
              {price}
            </Text>
            <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {plan.caption}
            </Text>
            {plan.badge ? (
              <View className="mt-2 self-start rounded-full bg-brand-500 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-white">
                  {plan.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SubscribeCTA({
  tier,
  ready,
  busy,
  onPress,
}: {
  tier: "free" | "trial" | "premium";
  ready: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  if (!ready && tier === "free") {
    return (
      <View className="rounded-2xl border border-stone-200 px-5 py-4 dark:border-stone-800">
        <Text className="text-center text-sm text-stone-500">Loading…</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60"
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-center text-base font-semibold text-white">
          {tier === "trial" ? "Subscribe to keep premium" : "Subscribe"}
        </Text>
      )}
    </Pressable>
  );
}

function ManageSection({
  busy,
  onManageInPlay,
  onRestore,
}: {
  busy: boolean;
  onManageInPlay: () => void;
  onRestore: () => void;
}) {
  return (
    <View className="gap-3">
      <Pressable
        onPress={onManageInPlay}
        className="flex-row items-center justify-between rounded-2xl border border-stone-200 px-5 py-4 active:bg-stone-100 dark:border-stone-800 dark:active:bg-stone-900"
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-medium text-stone-900 dark:text-stone-50">
            Manage subscription
          </Text>
          <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Cancel, change plan or update your card in Google Play
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#78716c" />
      </Pressable>

      <Pressable onPress={onRestore} disabled={busy} className="py-2">
        {busy ? (
          <ActivityIndicator color="#a8a29e" />
        ) : (
          <Text className="text-center text-sm text-stone-500 dark:text-stone-400">
            Restore purchase
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
