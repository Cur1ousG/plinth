/**
 * Which Lemon Squeezy variant a checkout should use.
 *
 * Two plans, priced so the annual works out at two months free. The ids are
 * per-store *and* per-mode: a test-mode variant id is not the live one, so
 * flipping the store to live means replacing these everywhere they appear
 * (.env for local, all three profiles in eas.json for builds).
 */

export type BillingPeriod = 'monthly' | 'annual';

const MONTHLY = process.env.EXPO_PUBLIC_LEMONSQUEEZY_VARIANT_MONTHLY ?? '';
const ANNUAL = process.env.EXPO_PUBLIC_LEMONSQUEEZY_VARIANT_ANNUAL ?? '';

export function getVariantId(period: BillingPeriod): string | null {
  const id = period === 'annual' ? ANNUAL : MONTHLY;
  return id.length > 0 ? id : null;
}

/**
 * Shown on the plan picker. Kept here beside the ids so the two can't drift —
 * a price displayed in the app that disagrees with the one on the checkout
 * page is worse than showing no price at all.
 *
 * These are display copy only. Lemon Squeezy charges whatever the variant is
 * set to; if you change a price there, change it here in the same sitting.
 */
export const PLANS: Record<
  BillingPeriod,
  { label: string; price: string; caption: string; badge?: string }
> = {
  monthly: {
    label: 'Monthly',
    price: '$8',
    caption: 'per month',
  },
  annual: {
    label: 'Yearly',
    price: '$79.99',
    caption: 'per year — $6.67/mo',
    badge: '2 months free',
  },
};
