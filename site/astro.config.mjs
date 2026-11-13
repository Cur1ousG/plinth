import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Feeds every canonical link and og:url via Astro.site, so it must match the
  // origin the site is served from. Change it here and nowhere else — a stale
  // canonical is what search engines index.
  site: 'https://plinthrecipes.com',

  integrations: [
    sitemap({
      // 404 has nothing to offer a search engine, and delete-account is a page
      // people are sent to deliberately — it shouldn't turn up in results for
      // anyone idly searching the app's name.
      filter: (page) =>
        !page.includes('/404') && !page.includes('/delete-account'),
    }),
  ],
});
