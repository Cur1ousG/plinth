import { defineConfig } from 'astro/config';

export default defineConfig({
  // Feeds every canonical link and og:url via Astro.site, so it must match the
  // origin the site is served from. Change it here and nowhere else — a stale
  // canonical is what search engines index.
  site: 'https://plinthrecipes.com',
});
