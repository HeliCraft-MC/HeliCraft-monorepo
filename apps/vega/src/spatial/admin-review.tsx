// oxlint-disable import/max-dependencies -- Administrative territory review composes immutable state evidence, current map, validation and reasoned ratification controls.
import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPoliticalMap, reviewTerritorialApplication } from '@helicraft/alhena';
import type { SpatialWorld, TerritorialApplication } from '@helicraft/alhena';
import { Alert, Button, FormField, Textarea, Dialog, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { PoliticalMap } from './map-view';
import { TerritoryAnalysis } from './analysis';
import { TerritoryLegalEvidence } from './legal-evidence';
import { DEFAULT_NATIVE_ZOOM, geometryCenter } from './model';
import { StateNameById } from '../state-name-by-id';
import styles from './territory-editor.module.scss';

// oxlint-disable-next-line max-lines-per-function -- One immutable proposal keeps its map, validation and explicit reasoned publication confirmation together.
function TerritorialAdminReview({
  application,
  world,
  onSaved,
}: Readonly<{
  application: TerritorialApplication;
  world: SpatialWorld;
  onSaved: () => void;
}>): ReactElement {
  const { locale, text } = useTranslation();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const map = useQuery({
    queryKey: ['ratification-map', world.id, application.id],
    queryFn: async () => {
      const result = await getPoliticalMap({
        client: browserClient(),
        path: { id: world.id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const mutation = useMutation({
    mutationFn: async (decision: 'APPROVE' | 'REJECT') => {
      await reviewTerritorialApplication({
        client: browserClient(),
        path: { id: application.id },
        body: { decision, reason },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      setConfirmation(false);
      onSaved();
    },
  });
  const { mutate } = mutation;
  const approve = useCallback((): void => {
    mutate('APPROVE');
  }, [mutate]);
  const open = useCallback((): void => {
    setConfirmation(true);
  }, []);
  const reject = useCallback((): void => {
    mutate('REJECT');
  }, [mutate]);
  const changeReason = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const { geometry } = application.draft;
  const center = useMemo(() => geometryCenter(geometry), [geometry]);
  return (
    <article className={styles.section}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {uiText(locale, 'Административное рассмотрение', 'Administrative review')}
          </p>
          <h2>
            <StateNameById id={application.draft.stateId} color="#859b76" />
          </h2>
        </div>
        <p className={styles.muted}>{displayText(world.name, locale)}</p>
      </header>
      <section className={styles.card}>
        <h3>{uiText(locale, 'Обоснование государства', 'State reasoning')}</h3>
        <p>{displayText(application.draft.reason, locale)}</p>
      </section>
      {application.decision.stale && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Государственная процедура устарела: требуется новое предложение.',
            'The state procedure is stale: a new proposal is required.',
          )}
        </Alert>
      )}
      <TerritoryAnalysis analysis={application.analysis} />
      {map.isPending && (
        <LoadingState
          label={uiText(
            locale,
            'Загрузка границ для сравнения…',
            'Loading boundaries for comparison…',
          )}
        />
      )}
      {map.data && (
        <PoliticalMap
          world={world}
          territories={map.data.territories}
          geometry={geometry}
          center={center}
          zoom={world.maxZoom ?? DEFAULT_NATIVE_ZOOM}
        />
      )}
      {map.error !== null && <Alert tone="danger">{text(errorMessage(map.error))}</Alert>}
      {application.review && (
        <Alert tone={application.review.decision === 'APPROVE' ? 'success' : 'danger'}>
          <p>
            {uiText(
              locale,
              application.review.decision === 'APPROVE'
                ? 'Границы опубликованы'
                : 'Заявка отклонена',
              application.review.decision === 'APPROVE'
                ? 'Boundaries published'
                : 'Application rejected',
            )}
          </p>
          <p>{application.review.reason}</p>
        </Alert>
      )}
      {application.status === 'REVIEW' && (
        <section className={styles.card}>
          <h3>{uiText(locale, 'Решение администрации', 'Administrative decision')}</h3>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Укажите, почему предложение можно принять или необходимо отклонить. Мотивировка сохранится вместе с решением.',
              'Explain why this proposal can be accepted or must be rejected. Your reason is recorded with the decision.',
            )}
          </p>
          <FormField
            label={uiText(
              locale,
              'Мотивировка решения администрации',
              'Administrative decision reason',
            )}
            htmlFor={`ratification-${application.id}`}
          >
            <Textarea
              id={`ratification-${application.id}`}
              value={reason}
              onChange={changeReason}
              maxLength={2000}
              required
            />
          </FormField>
          <div className={styles.toolbar}>
            <Button
              onClick={open}
              disabled={
                mutation.isPending ||
                !reason.trim() ||
                !application.analysis.valid ||
                application.analysis.conflicts.length > 0 ||
                application.decision.stale
              }
            >
              {uiText(locale, 'Ратифицировать территорию', 'Ratify territory')}
            </Button>
            <Button tone="quiet" onClick={reject} disabled={mutation.isPending || !reason.trim()}>
              {uiText(locale, 'Отклонить заявку', 'Reject application')}
            </Button>
          </div>
          <p>
            {uiText(
              locale,
              'Предложение на карте выделено жёлтым. Ратификация опубликует его без изменения формы. Если нужны исправления, отклоните заявку с пояснением.',
              'The proposal is highlighted in yellow. Ratification publishes its exact shape. If changes are needed, reject the application with an explanation.',
            )}
          </p>
        </section>
      )}
      <TerritoryLegalEvidence application={application} />
      <Dialog
        open={confirmation}
        onOpenChange={setConfirmation}
        title={uiText(locale, 'Опубликовать эти границы?', 'Publish these boundaries?')}
        description={uiText(
          locale,
          'Границы станут официальными на карте и в Minecraft. Предложение и ваша мотивировка сохранятся в истории.',
          'These boundaries become official on the map and in Minecraft. The proposal and your reason are preserved in history.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <p>{reason}</p>
        <Button onClick={approve} disabled={mutation.isPending}>
          {uiText(locale, 'Подтвердить ратификацию', 'Confirm ratification')}
        </Button>
      </Dialog>
      {mutation.error !== null && <Alert tone="danger">{text(errorMessage(mutation.error))}</Alert>}
    </article>
  );
}
export { TerritorialAdminReview };
