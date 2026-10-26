import { useCallback, useState } from 'react';
import type { FlatGeometry } from '@helicraft/atria';

const HISTORY_LIMIT = 30;
function useGeometryHistory(initial: FlatGeometry | null): {
  geometry: FlatGeometry | null;
  handleChange: (geometry: FlatGeometry | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const [state, setState] = useState<{ history: readonly (FlatGeometry | null)[]; index: number }>({
    history: [initial],
    index: 0,
  });
  const handleChange = useCallback((geometry: FlatGeometry | null): void => {
    setState((current) => {
      if (JSON.stringify(current.history[current.index] ?? null) === JSON.stringify(geometry)) {
        return current;
      }
      const history = [...current.history.slice(0, current.index + 1), geometry].slice(
        -HISTORY_LIMIT,
      );
      return { history, index: history.length - 1 };
    });
  }, []);
  const undo = useCallback((): void => {
    setState((current) => ({ ...current, index: Math.max(0, current.index - 1) }));
  }, []);
  const redo = useCallback((): void => {
    setState((current) => ({
      ...current,
      index: Math.min(current.history.length - 1, current.index + 1),
    }));
  }, []);
  return {
    geometry: state.history[state.index] ?? null,
    handleChange,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
  };
}
export { useGeometryHistory };
