# Reply to App Review — Guideline 2.1, Information Needed

This is the standard request Apple sends a developer account with no review
history. It is not a rejection: they want a demonstration video and written
answers to seven questions.

**Do the recording on the new build**, after the paywall fix (Terms of Use and
Privacy Policy links). Recording the old one would show a paywall missing the
links Apple explicitly asks you to display, which invites a 3.1.2 rejection on
top of this.

Paste everything below into the Resolution Center reply **and** into the Notes
field of App Review Information, which is what they ask for.

---

## 1. The screen recording

Film on the iPhone, in one continuous take, starting from the home screen.
Around 3–4 minutes. Don't rush; pause on each screen long enough to read it.

1. **Launch the app** from the home screen — show the splash and the home tab
2. **Sign out** (Profile → Settings → Account → Sign out)
3. **Register** a new account with email and password, including the email code
4. **Onboarding** — step through it
5. **Home** — today's pick, the weekly planner, trending
6. **Search** a recipe in Discover, open it, tick ingredients, add to the cart
7. **Shopping cart** — show items grouped by aisle
8. **Share a list** — the people icon, create an invite code. Say aloud or
   caption that lists are private and only reachable with a code
9. **Premium tab** — pause here for several seconds. The screen must clearly
   show both plan titles, both lengths, both prices, the renewal terms, and the
   **Terms of Use** and **Privacy Policy** links. Tap each link to show it opens
10. **Buy a subscription** — go through Apple's sheet to completion, and show
    premium unlocking afterwards
11. **Account deletion** — Profile → Settings → Account → Delete account, type
    DELETE, and complete it

Steps 9 and 11 are the ones they're really checking. Don't skip the deletion,
even though it destroys the account — make it the last thing you film.

## 2. Purpose and target audience

```
Plinth is a recipe app for people who cook at home. It solves the daily "what are we eating tonight" problem in three connected steps: find a recipe, put it on a day of the week, and get the ingredients onto a shopping list that is sorted by supermarket aisle.

The audience is home cooks who plan their meals, and households who share the shopping. There is no social feed, no video, and no advertising — the app is a private tool for one person or one household.

The value is in the connection between the three steps. Recipe sites give you recipes; calendar apps give you a plan; notes apps give you a list. Plinth is the one place where choosing a recipe on Monday means the right things are on your list by Saturday, and where the person who actually does the shopping sees the same list you do.
```

## 3. Setup and access

```
Sign-in is required, because saved recipes, meal plans and shopping lists belong to an account and sync across devices. Demo credentials are in the App Review Information section.

After signing in:

- Home: today's pick, the weekly planner (tap a slot to add a recipe), and trending recipes
- Discover: search by dish or ingredient. Tap any result to open the recipe, tick ingredients, and add them to the shopping cart
- Profile → Shopping Cart: items grouped by supermarket aisle. The people icon creates an invite code so a household can share one list
- Profile → Settings → Food preferences: allergens and ingredients to exclude, applied everywhere
- Premium tab: subscription plans, and the Dietitian plan once subscribed or on trial

Every new account, including the demo account, gets 21 days of Premium free. Premium features therefore work before any purchase is made. This is intended.

No sample files or special setup are needed.
```

## 4. External services

```
- Clerk — authentication (email/password and Google sign-in)
- Convex — application backend and database, hosted in Ireland
- Spoonacular — recipe data, under a paid commercial API licence
- RevenueCat — subscription state management on top of StoreKit
- Apple StoreKit / In-App Purchase — all payments. Plinth never sees or stores payment details
- Sentry — crash and error reporting, carrying an anonymous account identifier and no personal data

No AI or machine-learning services are used. No advertising or analytics networks are present.
```

## 5. Regional differences

```
The app functions identically in every region. There are no region-locked features and no regional content differences.

The only variation is subscription price, which the App Store localises from the base US price, and recipe availability, which depends on the third-party recipe database rather than on the user's location.
```

## 6. Regulated industry and third-party material

```
Plinth does not operate in a regulated industry.

The Dietitian plan calculates daily calorie and protein targets from body weight using standard per-kilogram formulas, and suggests recipes that fit them. It is a general wellness feature. It does not diagnose, treat, or manage any medical condition, and the app and its terms state this explicitly.

Recipe content is licensed from Spoonacular (spoonacular.com) under their paid commercial API plan, which permits use in a commercial application. A receipt for the current subscription can be provided on request.

Recipe photographs and source links are served by Spoonacular from the original publishers, and each recipe links back to its source.
```

## 7. In-App Purchase

```
Plinth has two auto-renewable subscriptions in a single subscription group, both unlocking the same "Premium" entitlement:

- Plinth Premium Monthly — US$7.99 per month
- Plinth Premium Yearly — US$79.99 per year

To reach them: open the app, tap the "Premium" tab in the bottom bar. The plan picker shows both options with their titles, lengths and prices, the renewal terms, and links to the Terms of Use and Privacy Policy. Tapping "Subscribe" opens Apple's purchase sheet.

Premium unlocks four features: importing a recipe from any link or pasted caption, browsing dishes by cuisine and country, a hand-picked recipe each day, and the Dietitian plan.

Search, saving recipes, the weekly planner and the shopping list are free and always available. Every new account also gets 21 days of Premium free, with no card required, so the paid features can be evaluated before any purchase.
```

---

## One gap worth knowing about

On shared shopping lists, a member can leave at any time, and invite codes are
single-use-at-a-time and expire after 7 days. But **an owner cannot currently
remove someone** they invited.

Apple's user-generated content rules are aimed at publicly distributed content,
and shared lists are private between people who exchanged a code — no feed, no
discovery, no profiles, no messaging. So this most likely won't come up.

If a reviewer does ask for a blocking mechanism, that's the answer they'll want,
and it's worth adding in 1.0.1 regardless: inviting a housemate you later fall
out with should not be permanent.
