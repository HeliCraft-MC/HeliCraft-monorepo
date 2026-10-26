import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FlatMapBounds } from '@helicraft/atria';
import { createClient, getPoliticalMap } from '@helicraft/alhena';
import type { SpatialSnapshot } from '@helicraft/alhena';
import { boundedViewport } from './viewport';

const VIEWPORT_DELAY_MS = 200;
function usePoliticalViewport(
  worldId: string,
  initial: SpatialSnapshot,
  bounds: FlatMapBounds,
): {
  snapshot: SpatialSnapshot | undefined;
  pending: boolean;
  failed: boolean;
  handleBounds: (value: FlatMapBounds) => void;
} {
  const [requested, setRequested] = useState(bounds);
  const [settled, setSettled] = useState(bounds);
  const handleBounds = useCallback((value: FlatMapBounds): void => {
    const next = boundedViewport(value);
    setRequested((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }, []);
  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setSettled(requested);
    }, VIEWPORT_DELAY_MS);
    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [requested]);
  const query = useQuery({
    queryKey: ['political-map-viewport', worldId, settled],
    queryFn: async ({ signal }) => {
      const result = await getPoliticalMap({
        client: createClient({ baseUrl: globalThis.location.origin, credentials: 'omit' }),
        path: { id: worldId },
        query: settled,
        signal,
        throwOnError: true,
      });
      return result.data;
    },
    initialData: JSON.stringify(settled) === JSON.stringify(bounds) ? initial : undefined,
  });
  return { snapshot: query.data, pending: query.isPending, failed: query.isError, handleBounds };
}
export { usePoliticalViewport };
