import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * RevenueCat tells us when a Play or App Store subscription changes.
 *
 * Unlike Lemon Squeezy there's no HMAC over the body — RevenueCat authenticates
 * with a fixed Authorization header you set when creating the webhook, so the
 * check is a constant-time compare of that value.
 *
 * `app_user_id` is the Clerk user id, which the client sets by calling
 * Purchases.logIn() with it. If that is ever skipped the events arrive keyed to
 * an anonymous RevenueCat id and match no one, so a missing or anonymous id is
 * rejected loudly rather than written somewhere harmless.
 */
type RevenueCatEvent = {
  event?: {
    type?: string;
    app_user_id?: string;
    product_id?: string;
    expiration_at_ms?: number | null;
    store?: string;
    environment?: string;
  };
};

/** RevenueCat event types mapped onto the statuses hasPremiumAccess knows. */
function statusForEvent(type: string): string | null {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return 'active';
    case 'TRIAL_STARTED':
    case 'TRIAL_CONVERTED':
      return 'on_trial';
    // Cancelled but paid up: access continues to the end of the period, which
    // is what 'cancelled' means everywhere else in this codebase.
    case 'CANCELLATION':
      return 'cancelled';
    case 'EXPIRATION':
      return 'expired';
    // A failed renewal the store is still retrying. Access continues to the end
    // of the grace period configured on the Play base plan — see
    // PREMIUM_STATUSES in _helpers.ts, which bounds it by currentPeriodEnd.
    case 'BILLING_ISSUE':
      return 'past_due';
    // Play lets people pause a subscription. They are not paying and should not
    // have access, but they have not cancelled either, so this is its own state
    // rather than 'expired' — and it must be handled, since falling through to
    // the default would leave the row 'active' and the account premium for free.
    case 'SUBSCRIPTION_PAUSED':
      return 'paused';
    default:
      return null; // TRANSFER, TEST, and anything new: acknowledge, ignore.
  }
}

http.route({
  path: '/revenuecat/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expected) {
      return new Response('REVENUECAT_WEBHOOK_SECRET not configured', { status: 500 });
    }
    const provided = request.headers.get('Authorization') ?? '';
    if (!timingSafeEqual(provided, expected)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const body = (await request.json()) as RevenueCatEvent;
    const event = body.event;
    if (!event?.type) return new Response('Missing event type', { status: 400 });

    // Sandbox purchases cost nothing. TestFlight builds, the Play internal
    // track and Apple's own reviewers all buy in sandbox, and RevenueCat sends
    // those events down the same webhook as real ones — so without this check a
    // free test purchase writes a row indistinguishable from a paid
    // subscription, granting premium and polluting every revenue figure.
    //
    // Acknowledged with 200 rather than rejected: a 4xx makes RevenueCat retry
    // and eventually flag the webhook as failing, and there is nothing here to
    // retry. Same reasoning as the unhandled-event-type case below.
    //
    // Only an explicit 'SANDBOX' is dropped. If RevenueCat ever stops sending
    // the field, a missing value is treated as production — someone who paid
    // and got nothing is a far worse failure than a tester who got in free.
    if (event.environment === 'SANDBOX') {
      return new Response('Ignored sandbox event', { status: 200 });
    }

    const status = statusForEvent(event.type);
    if (!status) return new Response('Ignored', { status: 200 });

    const userId = event.app_user_id;
    if (!userId || userId.startsWith('$RCAnonymousID:')) {
      return new Response('Missing or anonymous app_user_id', { status: 400 });
    }

    await ctx.runMutation(internal.subscriptions.upsertFromRevenueCat, {
      userId,
      status,
      plan: event.product_id ?? 'unknown',
      currentPeriodEnd: event.expiration_at_ms ?? 0,
      provider: event.store === 'APP_STORE' ? 'appstore' : 'play',
      cancelledAt: event.type === 'CANCELLATION' ? Date.now() : undefined,
    });

    return new Response('ok', { status: 200 });
  }),
});

export default http;
