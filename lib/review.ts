import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * Asking for an App Store rating.
 *
 * Ratings matter more than almost anything else we can do for the listing: an
 * app with a dozen reviews at 4.8 converts far better than one with none, and
 * the count feeds ranking as well as conversion.
 *
 * The native prompt is the only version worth using — it rates in place,
 * without sending anyone out to the store and losing them. But Apple caps it at
 * three appearances per user per year and silently does nothing with the rest.
 * There is no callback, no error, and no way to tell a shown prompt from a
 * dropped one. So the prompts are a budget to spend, not a thing to fire
 * hopefully.
 *
 * Hence: never on launch, never on a screen someone is only passing through.
 * Only after something has visibly gone right for them.
 */

const LAST_ASKED_KEY = 'review:lastAskedAt';

/**
 * Our own floor, well inside Apple's. Four months means a user meets the prompt
 * roughly twice a year at most, which leaves Apple's third appearance spare for
 * a future trigger without us having burned the allowance.
 */
const MIN_GAP_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * Let the screen that triggered this settle first. Without it the sheet lands
 * on top of the tap that caused it, which reads as the app interrupting rather
 * than responding.
 */
const SETTLE_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Request the native rating prompt, if it's available and we haven't asked
 * recently. Safe to call from anywhere: it resolves quietly rather than
 * throwing, because a rating prompt must never break the thing it followed.
 */
export async function maybeAskForReview(): Promise<void> {
  try {
    // False on a device with no store, and in environments where the API is
    // unavailable (simulators among them).
    if (!(await StoreReview.hasAction())) return;

    const raw = await AsyncStorage.getItem(LAST_ASKED_KEY);
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && last > 0 && Date.now() - last < MIN_GAP_MS) return;

    // Recorded before the request, not after. If requestReview throws, or
    // Apple quietly declines to show anything, we've still spent the attempt —
    // treating that as "never asked" would re-prompt on every subsequent shop.
    await AsyncStorage.setItem(LAST_ASKED_KEY, String(Date.now()));

    await wait(SETTLE_MS);
    await StoreReview.requestReview();
  } catch {
    // Storage unavailable, API missing, user in a weird state. None of it is
    // worth surfacing — they were in the middle of something else.
  }
}
