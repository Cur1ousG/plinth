import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';

import type { Recipe } from './types';

export type FeedFilters = {
  diet?: string;
  intolerances?: string;
};

/**
 * Home feed rails.
 *
 * Caching lives server-side in Convex (see convex/spoonacular.ts), so one upstream
 * Spoonacular fetch serves every user instead of one fetch per device. There is
 * deliberately no local cache here — Convex reads are fast and always fresh.
 */
export interface HomeFeedService {
  getTrending(filters?: FeedFilters): Promise<Recipe[]>;
  getQuickWeeknight(filters?: FeedFilters): Promise<Recipe[]>;
  getWeekendProjects(filters?: FeedFilters): Promise<Recipe[]>;
}

class ConvexHomeFeedService implements HomeFeedService {
  async getTrending() {
    return convex.action(api.spoonacular.trending, {});
  }

  async getQuickWeeknight(filters?: FeedFilters) {
    return convex.action(api.spoonacular.quickWeeknight, {
      diet: filters?.diet,
      intolerances: filters?.intolerances,
    });
  }

  async getWeekendProjects(filters?: FeedFilters) {
    return convex.action(api.spoonacular.weekendProjects, {
      diet: filters?.diet,
      intolerances: filters?.intolerances,
    });
  }
}

export const homeFeedService: HomeFeedService = new ConvexHomeFeedService();
