import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

function useStateRefresh(stateId: string, onSaved: () => void): () => Promise<void> {
  const queries = useQueryClient();
  return useCallback(async (): Promise<void> => {
    await queries.invalidateQueries({ queryKey: ['owned-state', stateId] });
    onSaved();
  }, [queries, stateId, onSaved]);
}
export { useStateRefresh };
