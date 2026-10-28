import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { saveTerritoryDraft, previewTerritoryDraft, submitTerritoryDraft } from '@helicraft/alhena';
import type {
  TerritoryDraft,
  TerritoryDraftInput,
  SpatialWorld,
  SpatialAnalysis,
  LocalizedInput,
} from '@helicraft/alhena';
import type { FlatMapMode, FlatPoint, EditorStep } from '@helicraft/atria';
import { browserClient } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { useGeometryHistory } from './use-geometry-history';
import { apiGeometry } from './geometry';
import { geometryCenter } from './model';

const AUTOSAVE_DELAY_MS = 1000;
type EditorRequest =
  | Readonly<{ action: 'submit'; version: number }>
  | Readonly<{ action: 'save' | 'autosave'; input: TerritoryDraftInput; version: number }>;
interface TerritoryEditorState {
  readonly saved: TerritoryDraft;
  readonly history: ReturnType<typeof useGeometryHistory>;
  readonly reason: LocalizedInput;
  readonly setReason: (reason: LocalizedInput) => void;
  readonly change: TerritoryDraftInput['change'];
  readonly setChange: (change: TerritoryDraftInput['change']) => void;
  readonly mode: FlatMapMode;
  readonly setMode: (mode: FlatMapMode) => void;
  readonly center: FlatPoint;
  readonly point: FlatPoint | null;
  readonly setPoint: (point: FlatPoint | null) => void;
  readonly analysis: SpatialAnalysis | null;
  readonly confirmation: boolean;
  readonly setConfirmation: (open: boolean) => void;
  readonly step: string;
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly mutation: UseMutationResult<void, Error, EditorRequest>;
  readonly sealed: boolean;
  readonly reset: () => void;
  readonly save: () => void;
  readonly submit: () => void;
  readonly open: () => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly selectStep: (step: string) => void;
  readonly go: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly saveStatus: string;
  readonly ready: boolean;
  readonly steps: readonly EditorStep[];
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- A single draft owns optimistic saves, geometry history, validation and the explicit immutable submission.
function useTerritoryEditor(
  initial: TerritoryDraft,
  world: SpatialWorld,
  onSaved: () => void,
): TerritoryEditorState {
  const { locale } = useTranslation();
  const [saved, setSaved] = useState(initial);
  const history = useGeometryHistory(initial.geometry);
  const [reason, setReason] = useState(initial.reason);
  const [change, setChange] = useState(initial.change);
  const [mode, setMode] = useState<FlatMapMode>('view');
  const [center, setCenter] = useState<FlatPoint>(() => geometryCenter(initial.geometry));
  const [point, setPoint] = useState<FlatPoint | null>(null);
  const [analysis, setAnalysis] = useState<SpatialAnalysis | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [step, setStep] = useState('boundary');
  const input = useMemo<TerritoryDraftInput>(
    () => ({ worldId: world.id, geometry: apiGeometry(history.geometry), reason, change }),
    [world.id, history.geometry, reason, change],
  );
  const dirty =
    JSON.stringify(input) !==
    JSON.stringify({
      worldId: saved.worldId,
      geometry: saved.geometry,
      reason: saved.reason,
      change: saved.change,
    });
  const { handleChange } = history;
  useEffect(() => {
    function unload(event: BeforeUnloadEvent): void {
      if (dirty) {
        event.preventDefault();
      }
    }
    window.addEventListener('beforeunload', unload);
    return (): void => {
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty]);
  const mutation = useMutation({
    mutationFn: async (request: EditorRequest) => {
      const client = browserClient();
      if (request.action === 'submit') {
        await submitTerritoryDraft({
          client,
          path: { id: saved.id },
          body: { version: request.version },
          throwOnError: true,
        });
        setConfirmation(false);
        onSaved();
        return;
      }
      setAnalysis(null);
      const result = await saveTerritoryDraft({
        client,
        path: { id: saved.id },
        body: { ...request.input, version: request.version },
        throwOnError: true,
      });
      setSaved(result.data);
      if (request.action === 'save' && result.data.geometry !== null) {
        const preview = await previewTerritoryDraft({
          client,
          path: { id: saved.id },
          throwOnError: true,
        });
        setAnalysis(preview.data);
      }
    },
  });
  const { mutate } = mutation;
  const sealed = saved.sealedAt !== null;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (dirty && !sealed && !mutation.isPending && mutation.error === null) {
      timer = setTimeout(() => {
        mutate({ action: 'autosave', input, version: saved.version });
      }, AUTOSAVE_DELAY_MS);
    }
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [dirty, input, sealed, mutation.isPending, mutation.error, mutate, saved.version]);
  const reset = useCallback((): void => {
    handleChange(saved.geometry);
    setReason(saved.reason);
    setChange(saved.change);
    setMode('view');
  }, [handleChange, saved]);
  const save = useCallback((): void => {
    mutate({ action: 'save', input, version: saved.version });
  }, [mutate, input, saved.version]);
  const submit = useCallback((): void => {
    mutate({ action: 'submit', version: saved.version });
  }, [mutate, saved.version]);
  const open = useCallback((): void => {
    setConfirmation(true);
  }, []);
  const next = useCallback((): void => {
    setMode('view');
    setStep('proposal');
  }, []);
  const back = useCallback((): void => {
    setStep('boundary');
  }, []);
  const selectStep = useCallback((value: string): void => {
    setMode('view');
    setStep(value);
  }, []);
  const go = useCallback((event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const x = Number(data.get('x'));
    const z = Number(data.get('z'));
    if (Number.isFinite(x) && Number.isFinite(z)) {
      setCenter([x, z]);
    }
  }, []);
  let saveStatus = uiText(locale, 'Все изменения сохранены.', 'All changes saved.');
  if (dirty) {
    saveStatus = uiText(locale, 'Есть несохранённые изменения.', 'You have unsaved changes.');
  }
  if (mutation.isPending) {
    saveStatus =
      mutation.variables?.action === 'submit'
        ? uiText(locale, 'Отправка предложения…', 'Submitting proposal…')
        : uiText(locale, 'Сохранение черновика…', 'Saving draft…');
  }
  const ready =
    !mutation.isPending &&
    !dirty &&
    analysis?.valid === true &&
    analysis.conflicts.length === 0 &&
    displayText(reason, locale).trim() !== '';
  const steps = useMemo(
    () => [
      { id: 'boundary', label: uiText(locale, 'Границы на карте', 'Boundaries on the map') },
      { id: 'proposal', label: uiText(locale, 'Обоснование и отправка', 'Reason and submission') },
    ],
    [locale],
  );
  return {
    saved,
    history,
    reason,
    setReason,
    change,
    setChange,
    mode,
    setMode,
    center,
    point,
    setPoint,
    analysis,
    confirmation,
    setConfirmation,
    step,
    dirty,
    busy: dirty || mutation.isPending,
    mutation,
    sealed,
    reset,
    save,
    submit,
    open,
    next,
    back,
    selectStep,
    go,
    saveStatus,
    ready,
    steps,
  };
}
export { useTerritoryEditor };
