import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { createVoting, publishVoting, updateVoting } from '@helicraft/alhena';
import type { VotingInput } from '@helicraft/alhena';
import { browserClient } from '../account-api';

const AUTOSAVE_MS = 1500;
type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type PollPersistence = UseMutationResult<string, unknown, boolean> & {
  readonly autosaveStatus: AutosaveStatus;
};
function usePollWriter(draftId: string | undefined): {
  persist: (snapshot: VotingInput, publish: boolean) => Promise<string>;
  reset: () => void;
} {
  const savedId = useRef(draftId);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const persist = useCallback(async (snapshot: VotingInput, publish: boolean): Promise<string> => {
    // oxlint-disable-next-line promise/prefer-await-to-then -- Queue writes in user-action order so an older autosave cannot overwrite a newer manual save.
    const job = queue.current.then(async () => {
      let id = savedId.current;
      if (id === undefined) {
        const result = await createVoting({
          client: browserClient(),
          body: snapshot,
          throwOnError: true,
        });
        const { id: createdId } = result.data;
        id = createdId;
        savedId.current = id;
      } else {
        await updateVoting({
          client: browserClient(),
          path: { id },
          body: snapshot,
          throwOnError: true,
        });
      }
      if (publish) {
        await publishVoting({ client: browserClient(), path: { id }, throwOnError: true });
      }
      return id;
    });
    // oxlint-disable-next-line promise/prefer-await-to-then -- A failed save must not poison the serial write queue.
    queue.current = job.catch(() => null);
    return await job;
  }, []);
  const reset = useCallback((): void => {
    savedId.current = draftId;
  }, [draftId]);
  return { persist, reset };
}
function usePollPersistence(
  input: VotingInput,
  draftId: string | undefined,
  onSaved: () => void,
): PollPersistence {
  const { persist, reset } = usePollWriter(draftId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [savedInput, setSavedInput] = useState<VotingInput | null>(null);
  useEffect(() => {
    async function autosave(): Promise<void> {
      setAutosaveStatus('saving');
      try {
        await persist(input, false);
        setSavedInput(input);
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      }
    }
    if (input.survey) {
      timer.current = setTimeout(() => {
        void autosave();
      }, AUTOSAVE_MS);
    }
    return (): void => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, [input, persist]);
  const mutation = useMutation<string, unknown, boolean>({
    mutationFn: async (publish) => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
      const id = await persist(input, publish);
      reset();
      onSaved();
      return id;
    },
  });
  return {
    ...mutation,
    autosaveStatus: autosaveStatus === 'saved' && savedInput !== input ? 'idle' : autosaveStatus,
  };
}
export { usePollPersistence };
