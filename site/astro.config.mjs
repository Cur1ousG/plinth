import { defineConfig } from 'astro/config';

export default defineConfig({
  // Used for canonical URLs and Open Graph tags, so it must match the origin the
  // site is actually served from. Update this when a custom domain is attached.
  // Feeds every canonical link and og:url via Astro.site. Change it here and
  // nowhere else — a stale canonical is what search engines index.
  site: 'https://plinth.plinthrecipes.workers.dev',
});
