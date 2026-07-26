# Marketing screenshots — capture checklist

App Store and Play Store both require a set of screenshots before you can submit.
This doc tells you what to capture, at what resolution, and how to make them look polished.

## Required sizes (2026)

### Apple App Store
- **iPhone 6.9"** (iPhone 16 Pro Max class) — 1290 × 2796 px — **required**
- **iPhone 6.5"** (iPhone 11 Pro Max / older) — 1242 × 2688 px — required only if not auto-derived
- 2–10 screenshots per size
- PNG or JPEG, RGB, no alpha

### Google Play Store
- **Phone screenshots** — minimum 1080 × 1920 px, max 7680 × 7680 px
- 2–8 screenshots
- 16:9 or 9:16 aspect, JPEG or 24-bit PNG (no alpha)
- Plus a **feature graphic**: 1024 × 500 px (separate from screenshots)

You can capture once at high resolution (1290 × 2796) and downscale for Play.

## What to capture (8 frames)

Capture in this order, each as a clean phone screenshot. Sign in with a real account
that has some saved recipes and planned meals so the screens look populated, not empty.

1. **Home — populated.** Greeting + Dish-of-the-day card + Browse-by-cuisine rail visible
   (premium trial active so you see the real card, not the lock).
2. **Calendar cookbook with planned meals.** Scroll Home down so the calendar strip and
   3 of the 4 meal slots are visible with thumbnails. This is the visual proof of the
   meal-planning feature.
3. **Discover — search results.** Search for `pasta`. Show the results grid with at least
   8 recipes visible.
4. **Recipe detail — Ingredients tab.** Open any recipe. Capture with the ingredients list
   and the orange "Add to shopping cart" button visible at the bottom.
5. **Recipe detail — Instructions tab.** Same recipe, swap to Instructions tab so the
   in-app browser is showing the source page.
6. **Premium tab — trial state.** Should show "Your free trial is on · X days remaining"
   and the three perk cards.
7. **Dietitian plan results.** Open from Premium, fill in 75kg + Maintain, scroll down so
   the daily targets card and 2-3 recipe matches are visible.
8. **Shopping cart with checked items.** Open Profile → Shopping Cart with several items
   added (some checked, some not) so the "Clear N checked items" CTA is visible.

## How to capture cleanly

### On the dev build

```bash
npx expo start --dev-client
```

Open the app on your phone. **Use a physical device, not the simulator** — App Store
prefers real-device captures and notch/Dynamic Island detail makes them look authentic.

Take screenshots with **Power + Volume Down** (Android) or **Power + Volume Up** (iOS).
On Android, save to your Photos app, then AirDrop / cloud-sync to your computer.

### Sanity-check before submitting

- Status bar shows: full battery, full signal, time set to **9:41** (Apple convention).
  On iOS you can spoof this in dev with `xcrun simctl status_bar override` if running
  in simulator, but on device the natural status bar is fine — both stores accept it.
- No Metro / dev-client banners visible. If you see "Loading from..." or any developer
  toolbar, your screenshot is from a dev session — re-take after the app is fully loaded.
- No keyboard visible (dismiss before capturing search screens).
- Real recipe content (not "stub" placeholders).

### Polish (optional)

If you want store-listing screenshots that look designed rather than raw, run them
through a free tool:

- https://shots.so — drag in your screenshots, get them in styled phone frames
- https://screenshots.pro
- https://previewed.app

These let you add a phone bezel + caption + branded background. Most launched apps use
something like this. Not required by the stores, but it lifts the perceived quality
significantly.

## Feature graphic for Play Store (1024 × 500)

Plinth-flavoured ideas:
- Dark gradient background using brand orange (`#fb923c → #c2410c`)
- Tagline: "Cook smart. Eat well." or "Plan your week, one recipe at a time."
- Plinth logo / wordmark on the left, a phone mockup with Home tab on the right

Tools: Canva has a "Play Store feature graphic" template at the right size. ~10 minutes
to make.

## Where to put them

After capture, drop them in `docs/store-assets/` (we don't have this folder yet; create
it and `.gitignore` it if you don't want to commit large PNGs to git).
