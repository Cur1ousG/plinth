import { ConvexReactClient } from 'convex/react';

const url = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!url) {
  throw new Error(
    'Missing EXPO_PUBLIC_CONVEX_URL. Run `npx convex dev` once to provision your project.',
  );
}

export const convex = new ConvexReactClient(url, {
  unsavedChangesWarning: false,
});
