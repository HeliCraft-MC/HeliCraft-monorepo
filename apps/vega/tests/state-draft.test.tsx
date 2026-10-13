import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StateDraft } from '@helicraft/alhena';
import { useDraft } from '../src/states/use-draft';
import { emptyConfiguration } from '../../antares/src/modules/states/domain';

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function initialDraft(): StateDraft {
  return {
    id: ID,
    ownerId: ID,
    stateId: null,
    baseRevisionId: null,
    title: 'Initial',
    version: 1,
    step: 1,
    progress: 0,
    configuration: emptyConfiguration(),
    updatedAt: '2026-10-13T00:00:00Z',
    submittedStateId: null,
    deletedAt: null,
  };
}
function response(version: number): Response {
  return Response.json({ ...initialDraft(), version });
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('persistent draft autosave', () => {
  it('debounces typing and saves the latest value once', async () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(2));
    const hook = renderHook(() => useDraft(initialDraft()));
    act(() => {
      hook.result.current.setTitle('First');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    act(() => {
      hook.result.current.setTitle('Latest');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(hook.result.current.title).toBe('Latest');
    expect(hook.result.current.version).toBe(2);
    expect(hook.result.current.status).toBe('SAVED');
  });
  it('serializes concurrent flushes while edits arrive during a pending save', async () => {
    let release: ((value: Response) => void) | null = null;
    // oxlint-disable-next-line promise/avoid-new -- A deferred response exercises the real overlap between autosave and submit.
    const deferred = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(deferred)
      .mockResolvedValue(response(3));
    const hook = renderHook(() => useDraft(initialDraft()));
    act(() => {
      hook.result.current.setTitle('First');
    });
    let first: Promise<number> | null = null;
    act(() => {
      first = hook.result.current.flush();
    });
    act(() => {
      hook.result.current.setTitle('Second');
    });
    let second: Promise<number> | null = null;
    let third: Promise<number> | null = null;
    act(() => {
      second = hook.result.current.flush();
      third = hook.result.current.flush();
    });
    await act(async () => {
      if (!release) {
        throw new Error('Missing deferred response');
      }
      release(response(2));
      await Promise.all([first, second, third]);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(hook.result.current.version).toBe(3);
    expect(hook.result.current.status).toBe('SAVED');
  });
  it('retains unsaved data and blocks silent overwrites after an optimistic conflict', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json(
          { message: 'Changed in another tab', code: 'DRAFT_CONFLICT' },
          { status: 409 },
        ),
      );
    const hook = renderHook(() => useDraft(initialDraft()));
    act(() => {
      hook.result.current.setTitle('My unsaved title');
    });
    await act(async () => {
      await expect(hook.result.current.flush()).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    });
    expect(hook.result.current.title).toBe('My unsaved title');
    expect(hook.result.current.status).toBe('FAILED');
    await expect(hook.result.current.flush()).rejects.toThrow('Draft conflict');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
