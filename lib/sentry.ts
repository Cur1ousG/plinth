import * as Sentry from '@sentry/react-native';
import type React from 'react';

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

export function initSentry() {
  if (initialized || !sentryEnabled) return;

  try {
    Sentry.init({
      dsn,
      // Tag events so you can tell dev noise from real user crashes.
      environment: __DEV__ ? 'development' : 'production',
      // Full sampling in dev so you can verify the wiring; light sampling in prod.
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      // Don't ship console breadcrumbs from dev sessions.
      enableNativeCrashHandling: true,
      // We attach the Clerk user id explicitly (see setSentryUser); this stops
      // the SDK from opportunistically collecting IPs and other PII.
      sendDefaultPii: false,
      beforeSend(event) {
        // Drop events originating from the dev client — they're our own noise.
        if (__DEV__ && process.env.EXPO_PUBLIC_SENTRY_CAPTURE_DEV !== 'true') {
          return null;
        }
        return event;
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
  if (!sentryEnabled) return Component;
  try {
    return Sentry.wrap(Component);
  } catch {
    return Component;
  }
}
