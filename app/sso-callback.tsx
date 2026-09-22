import { Redirect } from 'expo-router';

/**
 * Where Google sends people back to: plinth://sso-callback.
 *
 * The in-app browser normally catches that address itself and finishes the
 * sign-in before any screen sees it. On some Android devices the system
 * delivers it as an ordinary deep link instead, and without a route here that
 * would land on Expo Router's "Unmatched route" page mid-sign-in. By the time
 * this renders the session is already set, so it just goes home.
 */
export default function SsoCallback() {
  return <Redirect href="/" />;
}
