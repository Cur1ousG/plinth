import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

/**
 * Refresh the shared recipe caches once a day.
 *
 * Runs at 04:00 UTC (early morning across EU/Africa, overnight in the Americas)
 * so the first real user of the day gets a warm cache instead of paying the
 * upstream latency. Costs ~4 Spoonacular points/day for the entire userbase.
 */
crons.daily(
  'warm recipe caches',
  { hourUTC: 4, minuteUTC: 0 },
  internal.spoonacular.warmCaches,
);

export default crons;
