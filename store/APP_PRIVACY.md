# App Store — App Privacy answers

App Store Connect → your app → App Privacy. These mirror the Play Data safety
answers, which were worked out against the code in September 2026.

**Tracking: No, for every data type.** Apple defines tracking as linking data
with data from other companies' apps or sites for advertising, or sharing it
with a data broker. Plinth does neither — no ad SDK, no attribution SDK, no
data broker. This is also why the app needs **no App Tracking Transparency
prompt**.

**A definition difference worth knowing.** Google counts data as "collected" the
moment it leaves the device. Apple's definition is narrower: data transmitted
off device *and retained longer than needed to service the request*. So a couple
of types declared on Play are arguably not collected under Apple's rules. Where
that's true it's noted below, with the cautious answer recommended — an
over-declaration is a listing detail, an under-declaration is a policy breach.

---

## Contact Info

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Name | Yes | Yes | No | App Functionality |
| Email Address | Yes | Yes | No | App Functionality |

Both are required at sign-up and held by Clerk for the life of the account.

## Health & Fitness

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Health | Yes | No | No | App Functionality, Product Personalization |

Allergens and intolerances. Stored on the device, sent to the backend as recipe
filters, and persisted only inside a shared cache key that isn't tied to anyone.
Hence collected but **not linked**.

Body weight from the Dietitian screen is **not** collected — it never leaves the
phone. Only the derived calorie and protein numbers are sent.

## Purchases

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Purchase History | Yes | Yes | No | App Functionality |

The subscription row that gates premium.

## User Content

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Photos or Videos | Yes | Yes | No | App Functionality |
| Other User Content | Yes | Yes | No | App Functionality |

Profile picture; imported recipes, shopping list items, list names, planned meals.

## Identifiers

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| User ID | Yes | Yes | No | App Functionality, Analytics |
| Device ID | Yes | Yes | No | Analytics |

The Clerk id keys every record and is attached to crash reports. Device and
installation identifiers come from Sentry and RevenueCat.

## Usage Data

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Product Interaction | Yes | Yes | No | Analytics |

Sentry performance tracing records screen transitions at 20% sampling in
production. Setting `tracesSampleRate` to 0 in lib/sentry.ts would remove this
declaration entirely, at the cost of performance visibility.

## Search History

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Search History | Yes | No | No | App Functionality |

Queries are cached under a `q2:<query>` key shared by all users, not stored
against anyone. Collected but not linked.

## Diagnostics

| Type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Crash Data | Yes | Yes | No | Analytics |
| Performance Data | Yes | Yes | No | Analytics |

Sentry, retained up to 90 days, carrying the Clerk id but never a name or email.

---

## Not collected

Precise or coarse location, physical address, phone number, payment info, credit
info, contacts, messages, emails, audio, gameplay content, customer support
content, browsing history, advertising data, sensitive info.

Payment details go to Apple, never to Plinth.

## Other submission answers

- **Account deletion**: yes, in-app — Profile → Settings → Account → Delete
  account. Apple requires this for any app with account creation.
- **Export compliance**: no non-exempt encryption. Declared in app.json as
  `ITSAppUsesNonExemptEncryption: false`.
- **Review notes**: say that every new account gets 21 days of premium free, so a
  reviewer seeing premium features work without paying isn't looking at a bug.
  Include a demo account, since sign-in is required to use the app.
