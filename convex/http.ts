import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

type SubscriptionAttrs = {
  store_id?: number;
  customer_id?: number;
  status?: string;
  product_name?: string;
  variant_name?: string;
  renews_at?: string | null;
  ends_at?: string | null;
  cancelled?: boolean;
  urls?: { update_payment_method?: string; customer_portal?: string };
};

type LemonSqueezyWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, string | undefined>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: SubscriptionAttrs;
  };
};

async function hmacHex(key: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(body));
  return Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

http.route({
  path: '/lemonsqueezy/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      return new Response('LEMONSQUEEZY_WEBHOOK_SECRET not configured', { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-signature') ?? '';

    const expected = await hmacHex(secret, body);
    if (!timingSafeEqual(expected, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    let event: LemonSqueezyWebhook;
    try {
      event = JSON.parse(body) as LemonSqueezyWebhook;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const eventName = event.meta?.event_name ?? '';
    const userId = event.meta?.custom_data?.user_id;
    const sub = event.data;
    const attrs = sub?.attributes;

    // Refund / chargeback path: data is a subscription-invoice that points at a subscription.
    // Downgrade the user immediately by marking the subscription expired.
    if (eventName === 'subscription_payment_refunded') {
      const refundedSubId =
        (attrs as { subscription_id?: number | string } | undefined)?.subscription_id;
      if (refundedSubId == null) {
        return new Response('Missing subscription_id on refund payload', { status: 400 });
      }
      await ctx.runMutation(internal.subscriptions.markRefundedBySubscriptionId, {
        lemonSqueezySubscriptionId: String(refundedSubId),
      });
      return new Response('ok', { status: 200 });
    }

    // Other events we care about must be on the subscriptions resource.
    if (!eventName.startsWith('subscription_') || sub?.type !== 'subscriptions' || !attrs) {
      return new Response('Ignored', { status: 200 });
    }

    if (!userId) {
      return new Response('Missing user_id in custom_data', { status: 400 });
    }
    if (!sub.id) {
      return new Response('Missing subscription id', { status: 400 });
    }

    const periodEnd = attrs.ends_at
      ? new Date(attrs.ends_at).getTime()
      : attrs.renews_at
        ? new Date(attrs.renews_at).getTime()
        : 0;

    await ctx.runMutation(internal.subscriptions.upsertFromWebhook, {
      userId,
      status: attrs.status ?? 'active',
      plan: attrs.variant_name ?? attrs.product_name ?? 'unknown',
      currentPeriodEnd: periodEnd,
      lemonSqueezySubscriptionId: String(sub.id),
      lemonSqueezyCustomerId: attrs.customer_id != null ? String(attrs.customer_id) : '',
      customerPortalUrl: attrs.urls?.customer_portal,
      updatePaymentMethodUrl: attrs.urls?.update_payment_method,
      cancelledAt:
        eventName === 'subscription_cancelled' || attrs.cancelled === true
          ? Date.now()
          : undefined,
    });

    return new Response('ok', { status: 200 });
  }),
});

export default http;
