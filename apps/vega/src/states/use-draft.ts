import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { saveStateDraft } from '@helicraft/alhena';
import type { StateDraft, StateConfiguration } from '@helicraft/alhena';
import { browserClient, errorMessage } from '../account-api';

const AUTOSAVE_DELAY = 700;
interface DraftFields {
  readonly configuration: StateConfiguration;
  readonly title: string;
  readonly step: number;
}
interface DraftEditorState extends DraftFields {
  readonly setConfiguration: Dispatch<SetStateAction<StateConfiguration>>;
  readonly setTitle: (value: string) => void;
  readonly setStep: (value: number) => void;
  readonly status: 'SAVED' | 'SAVING' | 'FAILED';
  readonly error: string | null;
  readonly flush: () => Promise<number>;
  readonly version: number;
}
// oxlint-disable-next-line max-lines-per-function -- The hook owns one serialized save queue and its associated lifecycle cleanup.
function useDraft(initial: Readonly<StateDraft>): DraftEditorState {
  const [configuration, setConfiguration] = useState(initial.configuration);
  const [title, setTitle] = useState(initial.title);
  const [step, setStep] = useState(initial.step);
  const [version, setVersion] = useState(initial.version);
  const [status, setStatus] = useState<'SAVED' | 'SAVING' | 'FAILED'>('SAVED');
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef<DraftFields>({
    configuration: initial.configuration,
    title: initial.title,
    step: initial.step,
  });
  const saved = useRef(
    JSON.stringify({
      configuration: initial.configuration,
      title: initial.title,
      step: initial.step,
    }),
  );
  const currentVersion = useRef(initial.version);
  const pending = useRef<Promise<number> | null>(null);
  const conflict = useRef(false);
  useLayoutEffect(() => {
    latest.current = { configuration, title, step };
  }, [configuration, title, step]);
  // oxlint-disable-next-line max-lines-per-function -- Save queue handles optimistic conflicts and serial version advancement.
  const flush = useCallback(async (): Promise<number> => {
    while (pending.current !== null) {
      // oxlint-disable-next-line no-await-in-loop -- Save versions must advance serially.
      await pending.current;
    }
    if (conflict.current) {
      throw new Error('Draft conflict');
    }
    const snapshot = latest.current;
    const fingerprint = JSON.stringify(snapshot);
    if (saved.current === fingerprint) {
      return currentVersion.current;
    }
    setStatus('SAVING');
    async function persist(): Promise<number> {
      try {
        const { data } = await saveStateDraft({
          client: browserClient(),
          path: { id: initial.id },
          body: { ...snapshot, version: currentVersion.current },
          throwOnError: true,
        });
        currentVersion.current = data.version;
        saved.current = fingerprint;
        setVersion(data.version);
        setStatus(JSON.stringify(latest.current) === fingerprint ? 'SAVED' : 'SAVING');
        setSaveError(null);
        return data.version;
      } catch (error) {
        setStatus('FAILED');
        setSaveError(errorMessage(error));
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'DRAFT_CONFLICT'
        ) {
          conflict.current = true;
        }
        throw error;
      }
    }
    pending.current = persist();
    const operation = pending.current;
    return await operation.then(
      (result) => {
        pending.current = null;
        return result;
      },
      (error: unknown) => {
        pending.current = null;
        throw error;
      },
    );
  }, [initial.id]);
  useEffect(() => {
    const fingerprint = JSON.stringify({ configuration, title, step });
    if (fingerprint === saved.current) {
      return (): void => {
        /* No timer is scheduled for an unchanged draft. */
      };
    }
    async function save(): Promise<void> {
      try {
        await flush();
      } catch {
        /* The persistent save status already explains the error. */
      }
    }
    const timer = setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY);
    return (): void => {
      clearTimeout(timer);
    };
  }, [configuration, title, step, flush]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent): void {
      if (JSON.stringify(latest.current) !== saved.current) {
        event.preventDefault();
      }
    }
    globalThis.addEventListener('beforeunload', beforeUnload);
    return (): void => {
      globalThis.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
  return {
    configuration,
    setConfiguration,
    title,
    setTitle,
    step,
    setStep,
    status,
    error: saveError,
    flush,
    version,
  };
}
export { useDraft };
