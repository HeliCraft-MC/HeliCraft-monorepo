import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { saveCompanyDraft } from '@helicraft/alhena';
import type { CompanyDraft, CompanyConfiguration } from '@helicraft/alhena';
import { browserClient, errorMessage } from '../account-api';

const AUTOSAVE_DELAY = 700;
interface DraftFields {
  configuration: CompanyConfiguration;
  step: number;
  title: string;
}
// oxlint-disable-next-line max-lines-per-function -- One serialized optimistic save queue owns corporate draft versions, autosave and unload protection, matching the state wizard lifecycle.
function useCompanyDraft(initial: CompanyDraft): {
  fields: DraftFields;
  change: (value: DraftFields) => void;
  saved: CompanyDraft;
  pending: boolean;
  error: string | null;
  flush: () => Promise<CompanyDraft>;
} {
  const [fields, setFields] = useState<DraftFields>({
    configuration: initial.configuration,
    title: initial.title,
    step: initial.step,
  });
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(fields);
  const persisted = useRef(initial);
  const fingerprint = useRef(JSON.stringify(fields));
  const operation = useRef<Promise<CompanyDraft> | null>(null);
  useLayoutEffect(() => {
    latest.current = fields;
  }, [fields]);
  const flush = useCallback(async (): Promise<CompanyDraft> => {
    while (operation.current !== null) {
      // oxlint-disable-next-line no-await-in-loop -- Optimistic draft versions must advance serially on the existing save queue.
      await operation.current;
    }
    const snapshot = latest.current;
    const serialized = JSON.stringify(snapshot);
    if (serialized === fingerprint.current) {
      return persisted.current;
    }
    setPending(true);
    const save = async (): Promise<CompanyDraft> => {
      try {
        const result = await saveCompanyDraft({
          client: browserClient(),
          path: { id: initial.id },
          body: { ...snapshot, version: persisted.current.version },
          throwOnError: true,
        });
        persisted.current = result.data;
        fingerprint.current = serialized;
        setSaved(result.data);
        setSaveError(null);
        return result.data;
      } catch (error) {
        setSaveError(errorMessage(error));
        setPending(false);
        operation.current = null;
        throw error;
      }
    };
    operation.current = save();
    const result = await operation.current;
    setPending(false);
    operation.current = null;
    return result;
  }, [initial.id]);
  const shouldBlockNavigation = useCallback(async (): Promise<boolean> => {
    try {
      await flush();
      return false;
    } catch {
      return true;
    }
  }, [flush]);
  useBlocker({ shouldBlockFn: shouldBlockNavigation, enableBeforeUnload: false });
  useEffect(() => {
    if (JSON.stringify(fields) === fingerprint.current) {
      return (): void => {
        /* Unchanged drafts do not schedule a save. */
      };
    }
    async function autosave(): Promise<void> {
      try {
        await flush();
      } catch {
        /* Save status retains the exact conflict or network failure for retry. */
      }
    }
    const timer = globalThis.setTimeout(() => {
      void autosave();
    }, AUTOSAVE_DELAY);
    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [fields, flush]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (JSON.stringify(latest.current) !== fingerprint.current) {
        event.preventDefault();
      }
    };
    globalThis.addEventListener('beforeunload', beforeUnload);
    return (): void => {
      globalThis.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
  return { fields, change: setFields, saved, pending, error: saveError, flush };
}
export { useCompanyDraft };
