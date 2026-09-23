import { Linking, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

/**
 * Play Billing, wrapped by RevenueCat.
 *
 * Google requires digital goods to be sold through Play Billing, so this is the
 * only checkout on Android. RevenueCat sits in front of it: the app asks for a
 * package and gets a purchase; RevenueCat tells our backend what happened via
 * the webhook in convex/http.ts.
 *
 * Entitlement is never decided here. The client's view of a purchase is a
 * convenience for updating the UI promptly — the backend's `subscriptions` row,
 * written by the webhook, is what actually gates paid features. A client that
 * lies about owning `premium` gets nothing from the server.
 */

/** Must match the entitlement identifier configured in RevenueCat exactly. */
export const ENTITLEMENT_ID = "premium";

const API_KEY =
  Platform.select({
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  }) ?? "";

/**
 * Everything here no-ops without a key, exactly as Sentry does. Metro dev
 * builds and anything built before the key was set keep working; the premium
 * screen shows a plain "checkout unavailable" rather than crashing on launch.
 */
export const purchasesEnabled = API_KEY.length > 0;

let configured = false;

export function configurePurchases() {
  if (configured || !purchasesEnabled) return;
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch (err) {
    // Never let billing setup break app startup.
    console.warn(
      "[purchases] configure failed; continuing without checkout",
      err,
    );
  }
}

/**
 * Tie purchases to the Clerk account rather than the device.
 *
 * This is what makes `app_user_id` on the webhook a Clerk id we can match a row
 * to. Skip it and RevenueCat invents an anonymous id, the webhook rejects the
 * event, and the person pays without ever being granted anything.
 */
export async function identifyPurchaser(userId: string) {
  if (!purchasesEnabled) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn("[purchases] logIn failed", err);
  }
}

export async function forgetPurchaser() {
  if (!purchasesEnabled) return;
  try {
    await Purchases.logOut();
  } catch {
    // Logging out an already-anonymous user throws; nothing to do about it.
  }
}

export type Plans = {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
};

/**
 * Why the last getPlans() came back empty, in words.
 *
 * A release build has no console to read, so without this "no prices" is
 * indistinguishable from a network blip, an offering that isn't marked current,
 * and products Play hasn't finished propagating. The premium screen shows it
 * when someone taps Subscribe with nothing to sell.
 */
export let plansDiagnostic: string | null = null;

/**
 * The current offering's monthly and annual packages, with their store prices.
 *
 * `offering.monthly` and `offering.annual` are shortcuts that only match
 * RevenueCat's reserved identifiers, `$rc_monthly` and `$rc_annual`. A package
 * added by hand — or by the setup wizard — is just as likely to be called
 * `monthly` or `yearly`, in which case those shortcuts are both null and the
 * paywall shows no prices at all while everything else looks configured.
 *
 * So: try the shortcut, then the package type the store reports, then the
 * identifier. Any of the three is enough.
 */
export async function getPlans(): Promise<Plans> {
  if (!purchasesEnabled) {
    plansDiagnostic = "No billing key in this build.";
    return { monthly: null, annual: null };
  }

  const offerings = await Purchases.getOfferings();
  // Fall back to the only offering there is when none is marked current, which
  // is a setting easy to miss in the dashboard.
  const all = Object.values(offerings.all ?? {});
  const current = offerings.current ?? (all.length === 1 ? all[0] : null);

  if (!current) {
    plansDiagnostic =
      all.length === 0
        ? "RevenueCat returned no offerings. Products may still be propagating from Play."
        : "No offering is marked current in RevenueCat.";
    return { monthly: null, annual: null };
  }

  const packages = current.availablePackages ?? [];

  const pick = (
    shortcut: PurchasesPackage | null | undefined,
    type: PACKAGE_TYPE,
    ...hints: string[]
  ): PurchasesPackage | null =>
    shortcut ??
    packages.find((p) => p.packageType === type) ??
    packages.find((p) =>
      hints.some((h) => p.identifier.toLowerCase().includes(h)),
    ) ??
    null;

  const plans = {
    monthly: pick(current.monthly, PACKAGE_TYPE.MONTHLY, "month"),
    annual: pick(current.annual, PACKAGE_TYPE.ANNUAL, "annual", "year"),
  };

  if (!plans.monthly || !plans.annual) {
    plansDiagnostic =
      packages.length === 0
        ? "The offering has no packages attached."
        : `Offering packages found: ${packages
            .map((p) => p.identifier)
            .join(", ")} — but no monthly/annual match.`;
  } else {
    plansDiagnostic = null;
  }

  return plans;
}

export class PurchaseCancelled extends Error {
  constructor() {
    super("Purchase cancelled");
    this.name = "PurchaseCancelled";
  }
}

/**
 * Buy a package. Resolves with whether RevenueCat considers the entitlement
 * active straight after the purchase.
 *
 * Backing out of Google's sheet is an ordinary thing to do, not an error worth
 * an alert, so it is thrown as its own type for the caller to swallow.
 */
export async function purchasePlan(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasEntitlement(customerInfo);
  } catch (err) {
    if (isUserCancelled(err)) throw new PurchaseCancelled();
    throw err;
  }
}

/**
 * Re-apply a purchase made on another device, or before a reinstall.
 *
 * Play remembers the purchase against the Google account; our backend only
 * learns of it through a webhook it may never have received for this Clerk id.
 * Restoring re-associates the two.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!purchasesEnabled) return false;
  const customerInfo = await Purchases.restorePurchases();
  return hasEntitlement(customerInfo);
}

export function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

function isUserCancelled(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return (
    code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    (err as { userCancelled?: boolean })?.userCancelled === true
  );
}

/**
 * Cancelling and changing payment details both belong to Play, not to us —
 * Google requires it and there is no API to do it in-app.
 */
export function openPlaySubscriptions(productId?: string) {
  const base = "https://play.google.com/store/account/subscriptions";
  const url = productId
    ? `${base}?sku=${encodeURIComponent(productId)}&package=com.plinth.recipes`
    : base;
  return Linking.openURL(url);
}
