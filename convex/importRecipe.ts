'use node';

import dns from 'node:dns/promises';
import net from 'node:net';

import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { action, type ActionCtx } from './_generated/server';
import { hostLabel, parseJsonLd, parsePastedText, type ParsedRecipeDraft } from './recipeParse';
import { USER_LIMITS, userKey } from './rateLimit';

/**
 * Bringing a recipe in from outside Plinth.
 *
 * Two doors into the same room. `fromUrl` handles recipe sites, which publish
 * schema.org JSON-LD because Google rewards it. `fromText` handles everything
 * that doesn't — chiefly Instagram and TikTok captions, where the user pastes
 * what they're looking at because we can't (and shouldn't) fetch it ourselves.
 *
 * Neither one saves anything. They return a draft for the import screen to show
 * and let the user correct, and saving goes through the existing
 * savedRecipes.save mutation. Parsing other people's pages is guesswork, so a
 * human confirms before it becomes their recipe.
 */

const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/**
 * The conventional polite-bot format. We identify ourselves rather than
 * impersonating a browser: the fetch is user-initiated and permitted by these
 * sites' robots.txt, so there's no reason to hide.
 *
 * It does mean some sites refuse us. Cloudflare and similar scores datacenter
 * IPs harshly, and Convex runs in one, so allrecipes, simplyrecipes and
 * seriouseats all return 403 to our servers while serving the same page fine
 * from a home connection. There's no fix for that short of pretending to be
 * Chrome; the paste-text path is the answer instead.
 */
const USER_AGENT =
  'Mozilla/5.0 (compatible; PlinthBot/1.0; +https://plinth.app) recipe import on behalf of a user';

/** Sites that will never yield to a fetch, with advice instead of a failure. */
const PASTE_INSTEAD = [
  { match: /(^|\.)instagram\.com$/i, name: 'Instagram' },
  { match: /(^|\.)tiktok\.com$/i, name: 'TikTok' },
  { match: /(^|\.)facebook\.com$/i, name: 'Facebook' },
  { match: /(^|\.)threads\.net$/i, name: 'Threads' },
];

export const fromUrl = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<ParsedRecipeDraft> => {
    const userId = await requirePremium(ctx);
    await consumeImportAllowance(ctx, userId);

    const target = await assertSafeUrl(url);

    const socialSite = PASTE_INSTEAD.find((s) => s.match.test(target.hostname));
    if (socialSite) {
      throw new Error(
        `${socialSite.name} doesn't publish recipes in a form we can read. Open the post, copy the caption, and paste it instead.`,
      );
    }

    const html = await fetchHtml(target);
    const draft = parseJsonLd(html, target.toString());
    if (!draft) {
      throw new Error(
        "We couldn't find a recipe on that page. Try copying the ingredients and method, and pasting them instead.",
      );
    }
    return draft;
  },
});

export const fromText = action({
  args: { text: v.string(), sourceLabel: v.optional(v.string()) },
  handler: async (ctx, { text, sourceLabel }): Promise<ParsedRecipeDraft> => {
    const userId = await requirePremium(ctx);
    await consumeImportAllowance(ctx, userId);

    const trimmed = text.trim();
    if (trimmed.length < 20) {
      throw new Error('That looks too short to be a recipe. Paste the whole caption.');
    }
    if (trimmed.length > 20_000) {
      throw new Error('That text is too long. Paste just the recipe.');
    }

    return parsePastedText(trimmed, sourceLabel);
  },
});

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Import is a paid feature, checked here rather than only in the UI. */
async function requirePremium(ctx: ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const { hasPremium } = await ctx.runQuery(api.profile.myAccess, {});
  if (!hasPremium) {
    throw new Error('Importing recipes is part of Plinth Premium.');
  }
  return identity.subject;
}

/**
 * Costs us no Spoonacular points, but it does make our server fetch a URL a
 * stranger chose, so it gets its own per-user ceiling.
 */
async function consumeImportAllowance(ctx: ActionCtx, userId: string): Promise<void> {
  const limit = USER_LIMITS.recipeImport;
  const result = await ctx.runMutation(internal.rateLimit.consume, {
    key: userKey(userId, 'recipeImport'),
    limit: limit.limit,
    windowMs: limit.windowMs,
  });
  if (!result.allowed) {
    throw new Error("You've imported a lot of recipes just now. Try again shortly.");
  }
}

/**
 * Server-side request forgery is the real risk in this feature: without this,
 * "import a recipe" is an open proxy that will fetch anything our backend can
 * reach and hand the body back to the caller.
 *
 * So: https only, and the hostname must resolve entirely to public addresses.
 * Resolving here (rather than pattern-matching the string) is what stops a
 * hostname that innocently points at 127.0.0.1 or a cloud metadata endpoint.
 */
async function assertSafeUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("That doesn't look like a link. Check it and try again.");
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Recipe links need to start with https://');
  }

  await assertPublicHost(parsed.hostname);
  return parsed;
}

async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: string[];
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      addresses = records.map((r) => r.address);
    } catch {
      throw new Error("We couldn't reach that site.");
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('That link points somewhere we cannot fetch.');
  }
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) || // link-local, incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast and reserved
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd')) return true;
  // IPv4-mapped (::ffff:127.0.0.1) would otherwise slip past the checks above.
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateAddress(mapped[1]) : false;
}

/**
 * Redirects are followed by hand so every hop gets the same host check — a
 * permitted URL redirecting to localhost is the classic way around an SSRF
 * guard that only validates what the user typed.
 */
async function fetchHtml(startUrl: URL): Promise<string> {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      throw new Error("That site didn't respond. Try again in a moment.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error("We couldn't load that page.");
      const next = new URL(location, url);
      if (next.protocol !== 'https:') throw new Error('That link redirects somewhere insecure.');
      await assertPublicHost(next.hostname);
      url = next;
      continue;
    }

    if (!res.ok) {
      // A 403 here usually isn't the site objecting to us — it's a bot filter
      // scoring our datacenter IP, and the same page loads fine in a browser.
      // Saying "this site blocks us" would be both wrong and unhelpful, so the
      // message points at the way round it instead.
      throw new Error(
        res.status === 403 || res.status === 401
          ? `We couldn't read ${hostLabel(url.toString()) ?? 'that page'} from our end. Open it, copy the ingredients and method, and use Paste text instead.`
          : "We couldn't load that page.",
      );
    }

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) throw new Error("That link isn't a recipe page.");

    return await readCapped(res);
  }

  throw new Error('That link redirects too many times.');
}

/** Stop a hostile or merely enormous response from exhausting the action. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, MAX_BYTES);

  const decoder = new TextDecoder();
  let out = '';
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out;
}
