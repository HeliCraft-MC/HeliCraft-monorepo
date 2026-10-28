import { useCallback, useState } from 'react';

type DraftNavigationAction = Readonly<{ kind: 'select' | 'create'; id: string }>;
interface DraftNavigation {
  readonly pending: DraftNavigationAction | null;
  readonly select: (id: string) => void;
  readonly create: (id: string) => void;
  readonly confirm: () => void;
  readonly cancel: () => void;
  readonly changeOpen: (open: boolean) => void;
}
function useDraftNavigation(
  busy: boolean,
  onSelect: (id: string) => void,
  onCreate: (worldId: string) => void,
): DraftNavigation {
  const [pending, setPending] = useState<DraftNavigationAction | null>(null);
  const select = useCallback(
    (id: string): void => {
      if (busy) {
        setPending({ kind: 'select', id });
      } else {
        onSelect(id);
      }
    },
    [busy, onSelect],
  );
  const create = useCallback(
    (id: string): void => {
      if (busy) {
        setPending({ kind: 'create', id });
      } else {
        onCreate(id);
      }
    },
    [busy, onCreate],
  );
  const cancel = useCallback((): void => {
    setPending(null);
  }, []);
  const confirm = useCallback((): void => {
    if (pending?.kind === 'select') {
      onSelect(pending.id);
    }
    if (pending?.kind === 'create') {
      onCreate(pending.id);
    }
    setPending(null);
  }, [pending, onSelect, onCreate]);
  const changeOpen = useCallback((open: boolean): void => {
    if (!open) {
      setPending(null);
    }
  }, []);
  return { pending, select, create, confirm, cancel, changeOpen };
}
export { useDraftNavigation };
