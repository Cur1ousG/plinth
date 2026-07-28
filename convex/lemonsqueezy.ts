'use node';

import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { action, type ActionCtx } from './_generated/server';
import { USER_LIMITS, userKey, type RateLimitBucket } from './rateLimit';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

/** Throw if the caller has exhausted their allowance for this bucket. */
async function enforceLimit(ctx: ActionCtx, userId: string, bucket: RateLimitBucket) {
  const { limit, windowMs } = USER_LIMITS[bucket];
  const result = await ctx.runMutation(internal.rateLimit.consume, {
    key: userKey(userId, bucket),
    limit,
    windowMs,
  });
  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterMs / 60_000);
    throw new Error(
      `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    );
  }
}

type LSCheckoutResponse = {
  data?: {
    id?: string;
    attributes?: { url?: string };
  };
  errors?: { detail?: string; title?: string }[];
};

async function callLemonSqueezy<T>(
  path: string,
  init: { method: string; body?: string },
): Promise<T> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY not configured in Convex environment');

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: init.body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Lemon Squeezy ${init.method} ${path} ${res.status}${text ? ` — ${text.slice(0, 160)}` : ''}`,
    );
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const cancelSubscription = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    await enforceLimit(ctx, userId, 'subscriptionChange');

    const sub = await ctx.runQuery(api.subscriptions.getMyStatus, {});
    if (!sub) throw new Error('No active subscription found');
    if (!sub.lemonSqueezySubscriptionId) throw new Error('Subscription has no Lemon Squeezy id');
    if (sub.userId !== userId) throw new Error('Subscription does not belong to user');

    await callLemonSqueezy(`/subscriptions/${sub.lemonSqueezySubscriptionId}`, {
      method: 'DELETE',
    });
    // Lemon Squeezy will fire a subscription_updated / subscription_cancelled webhook
    // shortly; the reactive query in the app will pick up the new state automatically.
  },
});

export const resumeSubscription = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    await enforceLimit(ctx, userId, 'subscriptionChange');

    const sub = await ctx.runQuery(api.subscriptions.getMyStatus, {});
    if (!sub) throw new Error('No subscription found');
    if (!sub.lemonSqueezySubscriptionId) throw new Error('Subscription has no Lemon Squeezy id');
    if (sub.userId !== userId) throw new Error('Subscription does not belong to user');

    const body = JSON.stringify({
      data: {
        type: 'subscriptions',
        id: sub.lemonSqueezySubscriptionId,
        attributes: { cancelled: false },
      },
    });

    await callLemonSqueezy(`/subscriptions/${sub.lemonSqueezySubscriptionId}`, {
      method: 'PATCH',
      body,
    });
  },
});

export const createCheckoutSession = action({
  args: {
    variantId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { variantId, email, name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    // Blocks brute-force fraud testing against the checkout endpoint.
    await enforceLimit(ctx, userId, 'checkout');

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY not configured in Convex environment');
    if (!storeId) throw new Error('LEMONSQUEEZY_STORE_ID not configured in Convex environment');

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            name,
            custom: { user_id: userId },
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: false,
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: String(storeId) },
          },
          variant: {
            data: { type: 'variants', id: String(variantId) },
          },
        },
      },
    };

    const res = await fetch(`${API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: LSCheckoutResponse | null = null;
    try {
      parsed = JSON.parse(text) as LSCheckoutResponse;
    } catch {
      // fall through
    }

    if (!res.ok) {
      const detail = parsed?.errors?.[0]?.detail ?? parsed?.errors?.[0]?.title;
      throw new Error(
        `Lemon Squeezy /checkouts ${res.status}${detail ? ` — ${detail}` : ` — ${text.slice(0, 160)}`}`,
      );
    }

    const url = parsed?.data?.attributes?.url;
    if (!url) throw new Error('Lemon Squeezy did not return a checkout URL');
    return { url };
  },
});
