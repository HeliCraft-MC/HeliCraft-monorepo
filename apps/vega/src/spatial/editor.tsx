// oxlint-disable import/max-dependencies -- The territory editor composes shared map/form controls with saved-version validation and the existing Governance submission API.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveTerritoryDraft, previewTerritoryDraft, submitTerritoryDraft } from '@helicraft/alhena';
import type {
  TerritoryDraft,
  TerritoryDraftInput,
  SpatialWorld,
  PublicTerritory,
  SpatialAnalysis,
} from '@helicraft/alhena';
import { Alert, Button, Dialog, FormField, TextField } from '@helicraft/atria';
import type { FlatMapMode, FlatPoint } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { PoliticalMap } from './map-view';
import { GeometryTools } from './geometry-tools';
import { useGeometryHistory } from './use-geometry-history';
import { apiGeometry } from './geometry';
import { TerritoryAnalysis } from './analysis';
import { EditorFields } from './editor-fields';
import { TerritoryApplicationStatus } from './application-status';
import { TerritoryHistory } from './history';
import { DEFAULT_NATIVE_ZOOM, geometryCenter } from './model';
import { CoordinateReadout } from './coordinate-readout';
import styles from './spatial.module.scss';

const AUTOSAVE_DELAY_MS = 1000;
type EditorRequest =
  | Readonly<{ action: 'submit'; version: number }>
  | Readonly<{ action: 'save' | 'autosave'; input: TerritoryDraftInput; version: number }>;
// oxlint-disable-next-line max-lines-per-function, max-statements -- One draft owns its unsaved edits, optimistic version, explicit submit confirmation and map viewport.
function TerritoryEditor({
  initial,
  world,
  territories,
  onSaved,
}: Readonly<{
  initial: TerritoryDraft;
  world: SpatialWorld;
  territories: readonly PublicTerritory[];
  onSaved: () => void;
}>): ReactElement {
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
    saveStatus = uiText(locale, 'Сохранение черновика…', 'Saving draft…');
  }
  return (
    <section className={styles.panel}>
      <h2>{displayText(world.name, locale)}</h2>
      <p>
        {uiText(locale, 'Черновик', 'Draft')} {saved.id} · {uiText(locale, 'Версия', 'Version')}{' '}
        {saved.version}
      </p>
      <p>
        {uiText(locale, 'Базовая ревизия', 'Base revision')}:{' '}
        {saved.baseRevisionId ?? uiText(locale, 'территория ещё не определена', 'no territory yet')}
      </p>
      {sealed && (
        <Alert>
          {uiText(
            locale,
            'Предложение отправлено. Геометрия и обоснование зафиксированы. Сначала требуется государственное решение, затем отдельная административная ратификация.',
            'Proposal submitted. Geometry and reasoning are frozen. The state decision must complete before independent administrative ratification.',
          )}
        </Alert>
      )}
      <TerritoryApplicationStatus draft={initial} />
      <TerritoryHistory worldId={world.id} stateId={initial.stateId} />
      {!sealed && (
        <>
          <EditorFields reason={reason} change={change} onReason={setReason} onChange={setChange} />
          <GeometryTools
            mode={mode}
            setMode={setMode}
            geometry={history.geometry}
            onChange={history.handleChange}
            undo={history.undo}
            redo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
          />
        </>
      )}
      <form className={styles.controls} onSubmit={go}>
        <FormField label="X" htmlFor="territory-x">
          <TextField
            id="territory-x"
            name="x"
            type="number"
            step="any"
            defaultValue={center[0]}
            required
          />
        </FormField>
        <FormField label="Z" htmlFor="territory-z">
          <TextField
            id="territory-z"
            name="z"
            type="number"
            step="any"
            defaultValue={center[1]}
            required
          />
        </FormField>
        <Button type="submit">
          {uiText(locale, 'Перейти к координатам', 'Go to coordinates')}
        </Button>
      </form>
      <PoliticalMap
        world={world}
        territories={territories}
        geometry={history.geometry}
        mode={sealed ? 'view' : mode}
        center={center}
        zoom={world.maxZoom ?? DEFAULT_NATIVE_ZOOM}
        onChange={sealed ? undefined : history.handleChange}
        onModeChange={setMode}
        onPoint={setPoint}
      />
      <CoordinateReadout point={point} />
      {!sealed && (
        <div className={styles.toolbar}>
          <Button tone="quiet" onClick={reset} disabled={!dirty || mutation.isPending}>
            {uiText(locale, 'Сбросить несохранённые изменения', 'Reset unsaved changes')}
          </Button>
          <Button onClick={save} disabled={mutation.isPending}>
            {uiText(locale, 'Сохранить и проверить', 'Save and validate')}
          </Button>
          <Button
            onClick={open}
            disabled={
              mutation.isPending ||
              dirty ||
              analysis?.valid !== true ||
              analysis.conflicts.length > 0 ||
              displayText(reason, locale).trim() === ''
            }
          >
            {uiText(locale, 'Отправить на государственное решение', 'Submit for state decision')}
          </Button>
        </div>
      )}
      <output aria-live="polite">{saveStatus}</output>
      {!dirty && analysis && <TerritoryAnalysis analysis={analysis} />}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      <Dialog
        open={confirmation}
        onOpenChange={setConfirmation}
        title={uiText(
          locale,
          'Отправить территориальное предложение?',
          'Submit this territory proposal?',
        )}
        description={uiText(
          locale,
          'После отправки этот черновик нельзя изменить. Государственная процедура и административная проверка выполняются отдельно. До ратификации границы не изменятся.',
          'This draft becomes immutable. State approval and administrative review are separate steps. Official boundaries change only after ratification.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <Button onClick={submit} disabled={mutation.isPending}>
          {uiText(locale, 'Подтвердить отправку', 'Confirm submission')}
        </Button>
      </Dialog>
    </section>
  );
}
export { TerritoryEditor };
