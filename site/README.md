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

## Deploying (Cloudflare Pages — free)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**
2. Authorise GitHub and pick `Cur1ousG/plinth`
3. Build settings — the root directory is the important one, since the site is a
   subfolder:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `site` |

4. **Save and Deploy**

You get `plinth.pages.dev` (or similar). Every push to `main` redeploys
automatically; pull requests get their own preview URL.

### Attaching a custom domain later

1. Cloudflare Pages → your project → **Custom domains** → **Set up a domain**
2. Follow the DNS prompts
3. Update `site` in [`astro.config.mjs`](./astro.config.mjs) to the new origin so
   canonical URLs and Open Graph tags point at the right place

## Keeping legal pages in sync

`src/pages/privacy.astro` and `src/pages/terms.astro` mirror
`app/legal/privacy.tsx` and `app/legal/terms.tsx` in the app. They're separate
files by design — the app renders React Native components, the site renders HTML
— but **the wording should match**. When you change one, change the other, and
bump the `updated` date in both.

The store listings link to the web versions; users read the in-app ones.
