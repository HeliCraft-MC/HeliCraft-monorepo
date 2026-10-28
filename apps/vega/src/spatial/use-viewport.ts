import { useCallback, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { FlatMapBounds } from '@helicraft/atria';
import { createClient, getPoliticalMap } from '@helicraft/alhena';
import type { SpatialSnapshot } from '@helicraft/alhena';
import { boundedViewport } from './viewport';

const VIEWPORT_DELAY_MS = 200;
async function loadViewport(
  worldId: string,
  bounds: FlatMapBounds,
  signal: AbortSignal,
): Promise<SpatialSnapshot> {
  const result = await getPoliticalMap({
    client: createClient({ baseUrl: globalThis.location.origin, credentials: 'omit' }),
    path: { id: worldId },
    query: bounds,
    signal,
    throwOnError: true,
  });
  return result.data;
}
function usePoliticalViewport(
  worldId: string,
  initial: SpatialSnapshot,
  bounds: FlatMapBounds,
): {
  snapshot: SpatialSnapshot | undefined;
  pending: boolean;
  failed: boolean;
  handleRetry: () => void;
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
    queryFn: async ({ signal }) => await loadViewport(worldId, settled, signal),
    initialData: JSON.stringify(settled) === JSON.stringify(bounds) ? initial : undefined,
    placeholderData: keepPreviousData,
  });
  const { refetch } = query;
  const handleRetry = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return {
    snapshot: query.data,
    pending: query.isFetching,
    failed: query.isError,
    handleBounds,
    handleRetry,
  };
}
export { usePoliticalViewport };
