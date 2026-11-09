# App Store listing copy

For App Store Connect → iOS App Version 1.0. Limits are Apple's.

---

## Promotional Text (170)

```
Every account starts with 21 days of Premium free — import any recipe, browse by cuisine, and get calorie and protein targets that fit your goal.
```

144 characters. This one is worth using well: it sits above the description and
is the **only** field you can change without submitting a new version, so it's
where seasonal or trial messaging goes later.

## Description (4000)

```
Plinth is a recipe app for people who actually cook. Search thousands of recipes, save the ones you like, and turn them into a week of meals and a shopping list that sorts itself by aisle. No feed to scroll, no ads, no ten-paragraph story before the ingredients.

FIND SOMETHING TO COOK
Search by dish, ingredient or craving. Every recipe opens with the ingredients and method laid out plainly, with the cook time and serving count up front, and a link to the original source when you want it.

PLAN THE WEEK
Drop recipes onto breakfast, lunch and dinner for any day. The planner is on your home screen, so deciding what to cook stops being a 6pm problem.

A SHOPPING LIST THAT MAKES SENSE
Add a recipe's ingredients to your list in one tap. Items group themselves by aisle, so you walk the shop once instead of three times.

Share a list with the people you live with using a short invite code. Everyone sees the same list, updated as items get ticked off, so nobody comes home with a second bag of onions.

SET IT UP ONCE
Tell Plinth about allergies, intolerances and ingredients you never want to see. Recipes containing them are hidden completely, not just pushed down the page.

PLINTH PREMIUM
Every account starts with a 21-day free trial of everything below. No card is needed to start it.

• Import any recipe. Paste a link from any recipe site, or the caption from a reel, and Plinth pulls out the ingredients and steps as a proper recipe you can save, plan and shop for.
• Dishes by region. Browse by cuisine and country.
• Dish for the day. A hand-picked recipe each morning.
• Dietitian plan. Calorie and protein targets for cutting, maintaining or bulking, with recipes that fit them.

After the trial, Premium is a monthly or yearly subscription. Search, saving, the planner and the shopping list stay free.

The Dietitian plan is a general wellness feature, not a medical service. Calorie and macro figures are estimates from standard formulas, not personalised medical advice.

PRIVACY
No ads and no trackers. We don't sell your data, and you can delete your account and everything in it from inside the app at any time.

Terms of use: https://plinthrecipes.com/terms/
Privacy policy: https://plinthrecipes.com/privacy/
```

Apple requires a link to your terms in the description or metadata for apps with
auto-renewable subscriptions, which is why both URLs are at the bottom.

## Keywords (100)

```
recipes,meal plan,shopping list,grocery,cooking,dinner,meal prep,cookbook,food,kitchen
```

85 characters. No spaces after commas — spaces count. Don't repeat words already
in your app name; Apple indexes those separately, so "Plinth", "recipes" and
"meal plans" would be wasted here if duplicated.

---

# 1.0.1 metadata

Revised after keyword research against App Store autocomplete (October 2026).
Three indexed fields, with no word spent twice across them.

## What the name already covers

```
Plinth: Recipes & Meal Plans
```

That indexes **Plinth, Recipes, Meal, Plans** for free. Every one of those is
therefore wasted in the subtitle or the keyword field.

## Subtitle (30) — currently empty

```
Meal planner & grocery list
```

27 characters. This field had never been filled in, which was throwing away 30
characters of some of the most heavily weighted indexing on the App Store.

It adds **planner, grocery, list** — the three best-validated terms that the app
name doesn't already cover. "Meal" repeats from the name, which costs five
characters, but the line has to read like a human wrote it: Apple rejects
obvious keyword stuffing, and this is shown to users under the app name, so it
affects conversion as well as ranking.

App Store Connect's own banner lists only name, category and privacy policy as
requiring a new version, so this may save immediately rather than waiting for a
submission.

## Keywords (100)

```
organizer,shopping,tracker,cookbook,dinner,prep,pantry,weekly,family,ideas,cook,healthy,quick,easy
```

98 characters. Single words, not phrases: Apple forms phrases from your
individual words within a localisation, so `shopping` plus `list` (in the
subtitle) already generates "shopping list" without spending the characters
twice.

Nothing here repeats the name or the subtitle. Dropped from 1.0: `recipes`,
`meal plan` and `cooking` (covered by the name), `grocery` and `shopping list`
(moved to the subtitle), and `food` and `kitchen` (too generic for a new app to
rank on at all).

## Why these words

Autocomplete research, by seed:

| Seed | Returned | Read as |
|---|---|---|
| `meal` | meal maker, meal planner, meal tracker, mealmory | **planner**, **tracker** confirmed |
| `meal p` | meal planner, meal plan | **planner** confirmed twice — strongest signal |
| `grocery` | grocery - smart shopping list, basket pal: grocery list | **grocery**, **shopping**, **list** confirmed |
| `recipe o` | the recipe organizer, feedr - recipe organizer, simmr: recipe organizer | **organizer** confirmed |

Most results were app names rather than search phrases. That is itself the
signal: three separate apps put "recipe organizer" in their title, and apps only
name themselves after a term that converts.

`pantry`, `weekly`, `family`, `ideas`, `cookbook`, `prep`, `healthy`, `quick`
and `easy` are judgement, not data — no autocomplete seed was run for them. If a
later pass on the seeds `dinner`, `cook`, `shopping l`, `what to` and `family m`
turns up nothing for one of them, swap it out for whatever does come back.

One caution on `tracker`: that is calorie-logging intent. The Dietitian plan is
adjacent to it, but Plinth is not a food logger, so people arriving on that term
may bounce. Cheap to include, but don't build the listing around it.

## Secondary category — currently unset

Optional and free. Health & Fitness fits the Dietitian plan; Lifestyle is the
safer general pick. Changing a category needs a new version, so it rides along
with this one.

## URLs

- **Support URL**: `https://plinthrecipes.com/support/`
- **Marketing URL**: `https://plinthrecipes.com/`

## Version and Copyright

- **Version**: `1.0`
- **Copyright**: `2026 Gregory-Shawn Muyatwa Masule`

## Build

**Add Build** → pick the TestFlight build you uploaded.

## App Review Information

**Sign-in required**: tick it. Plinth can't be used signed out, and a reviewer
who can't get in rejects the app.

Create a demo account on **production** Clerk — sign up in the TestFlight build
— and put those credentials here. Use a throwaway address, not your own.

**Notes:**

```
Plinth is a recipe app. Sign-in is required because saved recipes, meal plans and shopping lists belong to an account and sync across devices.

Every new account, including the demo account above, gets 21 days of Premium free. Premium features will therefore work without any purchase being made — this is intended, not a bug.

To test a subscription purchase, open the Premium tab and choose a plan. Entitlement is granted server-side from the App Store's transaction, so it may take a second or two to appear after the purchase completes.

The Dietitian plan calculates calorie and protein targets from body weight using standard per-kilogram formulas. It is a general wellness feature and is presented as such, both in the app and in the terms; it does not diagnose or treat anything.

Recipe content is licensed from Spoonacular.
```

## App Store Version Release

Choose **Manually release this version**.

Approval and launch then become separate decisions — you can line the iOS launch
up with Android rather than having Apple publish the moment a reviewer clicks
approve, possibly in the middle of your night.
