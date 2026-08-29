import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import type React from 'react';
import { Platform } from 'react-native';

/**
 * Crash / error reporting.
 *
 * Everything here is a no-op when EXPO_PUBLIC_SENTRY_DSN is unset, so local dev
 * and any build without the DSN behaves exactly as if Sentry weren't installed.
 * That keeps a misconfigured Sentry from ever taking the app down — which is
 * what happened the first time we wired this up.
 */

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const sentryEnabled = dsn.length > 0;

let initialized = false;

/**
 * Which build this is, so tester crashes stay filterable against the real
 * launch: `development`, `preview` or `production`, from the channel set per
 * profile in eas.json.
 *
 * `__DEV__` alone was not enough. It only identifies a Metro dev bundle —
 * everything else builds in production mode and so reported itself as
 * production, including a plain `expo export` run on this machine, which duly
 * filed two issues into the live project alongside real ones.
 */
function resolveEnvironment(): string {
  if (__DEV__) return 'development';

  // We don't ship a web build; the only way this runs is someone previewing an
  // export locally. That was the actual source of the noise, and it's the one
  // case we can rule out with certainty rather than inference.
  if (Platform.OS === 'web') return 'web-local';

  try {
    const channel = Updates.channel;
    if (channel) return channel;
  } catch {
    // expo-updates unavailable. Fall through to the cautious default below.
  }

  // A native production bundle with no channel: a local `expo run --variant
  // release`, or an EAS build whose channel didn't stick. Ambiguous, so it
  // reports — losing a real crash is worse than one tagged oddity, and the tag
  // makes it obvious what happened.
  return 'unknown-build';
}

export const sentryEnvironment = resolveEnvironment();

/**
 * Testers' crashes are the whole point right now, so `preview` reports. What we
 * don't want is this machine filing issues alongside them.
 *
 * Set EXPO_PUBLIC_SENTRY_CAPTURE_DEV=true to report from a local run anyway,
 * which is the only sane way to check the wiring still works.
 */
const SILENT_ENVIRONMENTS = ['development', 'web-local'];

const shouldReport =
  !SILENT_ENVIRONMENTS.includes(sentryEnvironment) ||
  process.env.EXPO_PUBLIC_SENTRY_CAPTURE_DEV === 'true';

export function initSentry() {
  if (initialized || !sentryEnabled || !shouldReport) return;

  try {
    Sentry.init({
      dsn,
      // Tag events so tester builds stay filterable against the real launch.
      environment: sentryEnvironment,
      // Testers are few, so keep every trace from preview. Production gets a
      // light sample because volume there is the thing that costs money.
      tracesSampleRate: sentryEnvironment === 'production' ? 0.2 : 1.0,
      enableNativeCrashHandling: true,
      // We attach the Clerk user id explicitly (see setSentryUser); this stops
      // the SDK from opportunistically collecting IPs and other PII.
      sendDefaultPii: false,
      beforeSend(event) {
        // Last line of defence. Sentry.init is also skipped entirely below when
        // this is false, so in practice nothing should reach here — but a
        // dropped event is cheaper than a polluted issue feed.
        return shouldReport ? event : null;
      },
    });
    initialized = true;
  } catch (err) {
    // Never let observability setup break app startup.
    console.warn('[sentry] init failed; continuing without crash reporting', err);
  }
}

/**
 * Associate errors with a user so you can tell "one person hit this 40 times"
 * apart from "40 people each hit it once".
 *
 * Deliberately only the opaque Clerk id — no email, no name. Enough to correlate
 * reports without shipping PII to a third party.
 */
export function setSentryUser(userId: string | null | undefined) {
  if (!sentryEnabled || !initialized) return;
  try {
    Sentry.setUser(userId ? { id: userId } : null);
  } catch {
    // ignore
  }
}

/** Report a handled error with context, for cases we catch but still want to know about. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled || !initialized) {
    if (__DEV__) console.error('[captureError]', err, context);
    return;
  }
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // ignore
  }
}

/**
 * Wrap the root component for error-boundary + performance instrumentation.
 * Falls through untouched when Sentry is disabled.
 */
export function wrapRoot(
  Component: React.ComponentType<Record<string, unknown>>,
): React.ComponentType<Record<string, unknown>> {
  if (!sentryEnabled || !shouldReport) return Component;
  try {
    return Sentry.wrap(Component);
  } catch {
    return Component;
  }
}
