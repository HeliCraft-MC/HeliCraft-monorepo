// oxlint-disable import/max-dependencies -- The territory editor composes shared map/form controls with saved-version validation and the existing Governance submission API.
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import type { TerritoryDraft, SpatialWorld, PublicTerritory } from '@helicraft/alhena';
import { Alert, Button, Dialog, StepNavigation } from '@helicraft/atria';
import { ArrowRight, CheckCircle2, CloudUpload } from 'lucide-react';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { PoliticalMap } from './map-view';
import { GeometryTools } from './geometry-tools';
import { GeometryCoordinates } from './geometry-coordinates';
import { useTerritoryEditor } from './use-territory-editor';
import { TerritoryProposal } from './editor-proposal';
import { TerritoryApplicationStatus } from './application-status';
import { TerritoryCoordinates } from './editor-coordinates';
import { TerritoryDraftDetails } from './editor-details';
import { DEFAULT_NATIVE_ZOOM } from './model';
import { CoordinateReadout } from './coordinate-readout';
import styles from './territory-editor.module.scss';

// oxlint-disable-next-line max-lines-per-function -- One draft owns its unsaved edits, optimistic version, explicit submit confirmation and map viewport.
function TerritoryEditor({
  initial,
  world,
  territories,
  onSaved,
  onEditingChange,
}: Readonly<{
  initial: TerritoryDraft;
  world: SpatialWorld;
  territories: readonly PublicTerritory[];
  onSaved: () => void;
  onEditingChange: (busy: boolean) => void;
}>): ReactElement {
  const { locale, text } = useTranslation();
  const editor = useTerritoryEditor(initial, world, onSaved);
  const {
    saved,
    history,
    mode,
    setMode,
    center,
    point,
    setPoint,
    confirmation,
    setConfirmation,
    step,
    dirty,
    busy,
    mutation,
    sealed,
    reset,
    save,
    submit,
    next,
    selectStep,
    go,
    saveStatus,
    steps,
  } = editor;
  useEffect(() => {
    onEditingChange(busy);
    return (): void => {
      onEditingChange(false);
    };
  }, [busy, onEditingChange]);
  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {uiText(
              locale,
              sealed ? 'Территориальное предложение' : 'Редактор территории',
              sealed ? 'Territory proposal' : 'Territory editor',
            )}
          </p>
          <h2>{displayText(world.name, locale)}</h2>
        </div>
        {!sealed && (
          <output className={styles.status} aria-live="polite">
            {dirty || mutation.isPending ? (
              <CloudUpload aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            {saveStatus}
          </output>
        )}
      </header>
      {sealed ? (
        <Alert>
          {uiText(
            locale,
            'Предложение отправлено. Геометрия и обоснование зафиксированы. Сначала требуется государственное решение, затем отдельная административная ратификация.',
            'Proposal submitted. Geometry and reasoning are frozen. The state decision must complete before independent administrative ratification.',
          )}
        </Alert>
      ) : (
        <StepNavigation
          label={uiText(locale, 'Подготовка территории', 'Prepare territory')}
          steps={steps}
          value={step}
          onChange={selectStep}
        />
      )}
      <TerritoryApplicationStatus draft={initial} />
      {(sealed || step === 'boundary') && (
        <>
          {!sealed && (
            <p className={styles.muted}>
              {uiText(
                locale,
                'Обведите территорию на карте. Ваше предложение показано жёлтым; утверждённые границы соседей — цветами государств.',
                'Outline your territory on the map. Your proposal is yellow; published neighboring boundaries use state colors.',
              )}
            </p>
          )}
          <div className={styles.mapStage}>
            {!sealed && (
              <GeometryTools
                mode={mode}
                setMode={setMode}
                geometry={history.geometry}
                undo={history.undo}
                redo={history.redo}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
              />
            )}
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
            <div className={styles.mapReadout}>
              <CoordinateReadout point={point} />
              <span hidden={point !== null}>
                {uiText(locale, 'X / Z · Нажмите на карту', 'X / Z · Click the map')}
              </span>
            </div>
          </div>
          <TerritoryCoordinates center={center} onSubmit={go} />
          {!sealed && (
            <GeometryCoordinates geometry={history.geometry} onChange={history.handleChange} />
          )}
          {!sealed && (
            <div className={styles.footer}>
              <Button tone="quiet" onClick={reset} disabled={!dirty || mutation.isPending}>
                {uiText(locale, 'Сбросить несохранённые изменения', 'Reset unsaved changes')}
              </Button>
              <Button onClick={next} disabled={history.geometry === null}>
                {uiText(locale, 'Далее: обоснование', 'Continue to reasoning')}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
      {!sealed && step === 'proposal' && <TerritoryProposal editor={editor} />}
      {mutation.error !== null && (
        <Alert tone="danger">
          <p>
            {uiText(
              locale,
              'Не удалось сохранить или отправить черновик. Ваши изменения остаются на экране. Повторите сохранение; если версия устарела, сначала сохраните нужные координаты и загрузите актуальный черновик.',
              'The draft could not be saved or submitted. Your edits remain on screen. Retry saving; if the version is outdated, copy any coordinates you need before reloading the latest draft.',
            )}
          </p>
          <p>{text(errorMessage(mutation.error))}</p>
          <Button tone="quiet" onClick={save} disabled={mutation.isPending}>
            {uiText(locale, 'Повторить сохранение', 'Retry saving')}
          </Button>
        </Alert>
      )}
      <TerritoryDraftDetails draft={saved} />
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
