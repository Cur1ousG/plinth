import { useCallback, useEffect, useMemo, useState } from 'react';

import { dietaryFiltersToParams } from '@/lib/dietaryFilters';
import { useSettings } from '@/providers/settings-provider';
import { homeFeedService } from '@/services/homeFeedService';
import type { Recipe } from '@/services/types';

type State = {
  trending: Recipe[];
  quickWeeknight: Recipe[];
  weekendProjects: Recipe[];
};

const empty: State = { trending: [], quickWeeknight: [], weekendProjects: [] };

export function useHomeFeed() {
  const { dietary } = useSettings();
  const filters = useMemo(() => dietaryFiltersToParams(dietary), [dietary]);

  const [data, setData] = useState<State>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [trending, quickWeeknight, weekendProjects] = await Promise.all([
        homeFeedService.getTrending(filters),
        homeFeedService.getQuickWeeknight(filters),
        homeFeedService.getWeekendProjects(filters),
      ]);
      setData({ trending, quickWeeknight, weekendProjects });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...data, loading, error, refresh: load };
}
