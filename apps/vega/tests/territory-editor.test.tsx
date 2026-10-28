import type { ReactElement, ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SpatialAnalysis, SpatialWorld, TerritoryDraft } from '@helicraft/alhena';
import { LocaleContext } from '../src/locale-context';
import { useTerritoryEditor } from '../src/spatial/use-territory-editor';
import { useDraftNavigation } from '../src/spatial/use-draft-navigation';

const world: SpatialWorld = {
  id: 'world',
  logicalKey: 'overworld',
  backendId: 'deneb',
  paperWorldId: 'paper-world',
  dimension: 'minecraft:overworld',
  name: { en: 'Overworld' },
  tileKey: 'minecraft_overworld',
  status: 'ACTIVE',
  version: 0,
};
const initial: TerritoryDraft = {
  id: 'draft',
  stateId: 'state',
  worldId: world.id,
  baseRevisionId: null,
  version: 1,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ],
  },
  reason: { en: 'First territory' },
  change: 'INITIAL',
  createdBy: 'owner',
  sealedAt: null,
  hash: null,
  directiveId: null,
  application: null,
  createdAt: '2026-10-27T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
};
const valid: SpatialAnalysis = {
  valid: true,
  problem: null,
  area: 50,
  addedArea: 50,
  removedArea: 0,
  vertices: 4,
  warnings: [],
  conflicts: [],
};
const english = {
  locale: 'en' as const,
  setLocale: (): void => {
    /* Fixed language. */
  },
};
function Wrapper({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <LocaleContext.Provider value={english}>{children}</LocaleContext.Provider>
    </QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('territory proposal preparation', () => {
  it('requires saved server validation and a separate explicit submission', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ ...initial, version: 2 }))
      .mockResolvedValueOnce(Response.json(valid));
    const onSaved = vi.fn<() => void>();
    const { result } = renderHook(() => useTerritoryEditor(initial, world, onSaved), {
      wrapper: Wrapper,
    });
    expect(result.current.ready).toBe(false);
    act(() => {
      result.current.next();
    });
    expect(result.current.step).toBe('proposal');
    expect(fetch).not.toHaveBeenCalled();
    act(() => {
      result.current.save();
    });
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    act(() => {
      result.current.open();
    });
    expect(result.current.confirmation).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSaved).not.toHaveBeenCalled();
    act(() => {
      result.current.setReason({ en: 'Changed after validation' });
    });
    expect(result.current.dirty).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it('keeps local edits and the saved version after a conflict so a retry remains explicit', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Version conflict' }, { status: 409 }));
    const onSaved = vi.fn<() => void>();
    const { result } = renderHook(() => useTerritoryEditor(initial, world, onSaved), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.setReason({ en: 'Keep this explanation' });
    });
    act(() => {
      result.current.save();
    });
    await waitFor(() => {
      expect(result.current.mutation.error).not.toBeNull();
    });
    expect(result.current.reason.en).toBe('Keep this explanation');
    expect(result.current.saved.version).toBe(1);
    expect(result.current.ready).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('territory draft navigation protection', () => {
  it('requires confirmation for a quick draft switch and preserves edits on cancellation', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const onSelect = vi.fn<(id: string) => void>();
    const onCreate = vi.fn<(worldId: string) => void>();
    const onSaved = vi.fn<() => void>();
    const { result } = renderHook(
      () => {
        const editor = useTerritoryEditor(initial, world, onSaved);
        const navigation = useDraftNavigation(
          editor.dirty || editor.mutation.isPending,
          onSelect,
          onCreate,
        );
        return { editor, navigation };
      },
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.editor.setReason({ en: 'Typed before the autosave delay' });
    });
    act(() => {
      result.current.navigation.select('another-draft');
    });
    expect(result.current.navigation.pending?.kind).toBe('select');
    expect(onSelect).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    act(() => {
      result.current.navigation.cancel();
    });
    expect(result.current.navigation.pending).toBeNull();
    expect(result.current.editor.reason.en).toBe('Typed before the autosave delay');
    act(() => {
      result.current.navigation.create('another-world');
    });
    expect(onCreate).not.toHaveBeenCalled();
    act(() => {
      result.current.navigation.confirm();
    });
    expect(onCreate).toHaveBeenCalledExactlyOnceWith('another-world');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('guards a pending save and keeps newer edits when that earlier save completes', async () => {
    const response = Promise.withResolvers<Response>();
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(Response.json(valid));
    const onSelect = vi.fn<(id: string) => void>();
    const onCreate = vi.fn<(worldId: string) => void>();
    const onSaved = vi.fn<() => void>();
    const { result } = renderHook(
      () => {
        const editor = useTerritoryEditor(initial, world, onSaved);
        const navigation = useDraftNavigation(
          editor.dirty || editor.mutation.isPending,
          onSelect,
          onCreate,
        );
        return { editor, navigation };
      },
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.editor.save();
    });
    await waitFor(() => {
      expect(result.current.editor.mutation.isPending).toBe(true);
    });
    act(() => {
      result.current.navigation.select('another-draft');
    });
    expect(onSelect).not.toHaveBeenCalled();
    act(() => {
      result.current.editor.setReason({ en: 'Newer edit during the request' });
    });
    response.resolve(Response.json({ ...initial, version: 2 }));
    await waitFor(() => {
      expect(result.current.editor.mutation.isPending).toBe(false);
    });
    act(() => {
      result.current.navigation.cancel();
    });
    expect(result.current.editor.reason.en).toBe('Newer edit during the request');
    expect(result.current.editor.saved.reason.en).toBe('First territory');
    expect(result.current.editor.dirty).toBe(true);
    expect(result.current.editor.ready).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
