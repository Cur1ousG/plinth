import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';

const TRIAL_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_MS = TRIAL_DAYS * DAY_MS;

export type Tier = 'free' | 'trial' | 'premium';

export type Entitlement = {
  tier: Tier;
  hasPremium: boolean;
  daysRemaining: number;
  expiresAt: number | null;
  cancelled: boolean;
  ready: boolean;
};

export function useEntitlement(): Entitlement {
  const { user, isSignedIn, isLoaded } = useUser();
  const sub = useQuery(api.subscriptions.getMyStatus, isSignedIn ? {} : 'skip');

  if (!isLoaded || !user) {
    return {
      tier: 'free',
      hasPremium: false,
      daysRemaining: 0,
      expiresAt: null,
      cancelled: false,
      ready: false,
    };
  }

  const subReady = sub !== undefined;

  const createdAtMs = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  const trialEnd = createdAtMs + TRIAL_MS;
  const inTrial = Date.now() < trialEnd;

  // Premium statuses: still paying ('active', 'on_trial'), cancelled-but-not-yet
  // -expired, or in the store's grace period after a failed renewal
  // ('past_due'). Kept in step with PREMIUM_STATUSES in convex/_helpers.ts,
  // which is what actually enforces this.
  const premiumStatuses = new Set(['active', 'on_trial', 'cancelled', 'past_due']);
  const subStillPaid =
    !!sub && premiumStatuses.has(sub.status) && sub.currentPeriodEnd > Date.now();

  let tier: Tier = 'free';
  let expiresAt: number | null = null;

  if (subStillPaid) {
    tier = 'premium';
    expiresAt = sub.currentPeriodEnd;
  } else if (inTrial) {
    tier = 'trial';
    expiresAt = trialEnd;
  }

  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / DAY_MS))
    : 0;

  const cancelled = !!sub && sub.status === 'cancelled';

  return {
    tier,
    hasPremium: tier !== 'free',
    daysRemaining,
    expiresAt,
    cancelled,
    ready: subReady,
  };
}
