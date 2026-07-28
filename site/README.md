# Plinth website

Static marketing site — landing page, privacy policy, terms of service, support.
Built with [Astro](https://astro.build); ships no JavaScript.

Lives in the same repo as the app so the web privacy policy sits next to the
in-app one and the two are less likely to drift apart.

## Local development

```bash
cd site
npm install
npm run dev      # http://localhost:4321
```

```bash
npm run build    # outputs to site/dist
npm run preview  # serve the built output
```

## Deploying (Cloudflare Workers — free)

Cloudflare no longer offers Pages projects on new accounts; Workers serves
static assets directly instead. [`wrangler.jsonc`](./wrangler.jsonc) configures
that — there's no Worker script, just an `assets` directory, so Cloudflare
serves the built HTML straight from its edge.

1. https://dash.cloudflare.com → **Workers & Pages** → **Create application**
2. Connect to Git and pick `Cur1ousG/plinth`
3. Settings:

   | Setting | Value |
   | --- | --- |
   | Project name | `plinth` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | **Root directory** (under Advanced settings) | **`site`** |

   The root directory is the one that's easy to miss — without it Cloudflare
   builds from the repo root and finds the Expo app instead of the site.

4. **Deploy**

You'll get `plinth.<your-subdomain>.workers.dev`. Every push to `main`
redeploys automatically.

### Deploying by hand

```bash
cd site
npm run build
npx wrangler deploy
```

### Attaching a custom domain later

1. Cloudflare dashboard → your Worker → **Settings → Domains & Routes**
2. Add a custom domain and follow the DNS prompts
3. Update `site` in [`astro.config.mjs`](./astro.config.mjs) to the new origin so
   canonical URLs and Open Graph tags point at the right place

## Keeping legal pages in sync

`src/pages/privacy.astro` and `src/pages/terms.astro` mirror
`app/legal/privacy.tsx` and `app/legal/terms.tsx` in the app. They're separate
files by design — the app renders React Native components, the site renders HTML
— but **the wording should match**. When you change one, change the other, and
bump the `updated` date in both.

The store listings link to the web versions; users read the in-app ones.
