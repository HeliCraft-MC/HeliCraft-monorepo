// oxlint-disable import/max-dependencies -- Administrative territory review composes immutable state evidence, current map, validation and reasoned ratification controls.
import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPoliticalMap, reviewTerritorialApplication } from '@helicraft/alhena';
import type { SpatialWorld, TerritorialApplication } from '@helicraft/alhena';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { PoliticalMap } from './map-view';
import { TerritoryAnalysis } from './analysis';
import { DEFAULT_NATIVE_ZOOM, geometryCenter } from './model';
import styles from './spatial.module.scss';

function TerritorialAdminReview({
  application,
  world,
  onSaved,
}: Readonly<{
  application: TerritorialApplication;
  world: SpatialWorld;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [reason, setReason] = useState('');
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
    onSuccess: onSaved,
  });
  const { mutate } = mutation;
  const approve = useCallback((): void => {
    mutate('APPROVE');
  }, [mutate]);
  const reject = useCallback((): void => {
    mutate('REJECT');
  }, [mutate]);
  const changeReason = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const { geometry } = application.draft;
  const center = useMemo(() => geometryCenter(geometry), [geometry]);
  return (
    <article className={styles.panel}>
      <h2>
        {uiText(locale, 'Заявка', 'Application')} {application.id}
      </h2>
      <p>
        {uiText(locale, 'Государство', 'State')}: {application.draft.stateId}
      </p>
      <p>
        {uiText(locale, 'Обоснование', 'Reason')}: {displayText(application.draft.reason, locale)}
      </p>
      <p>
        {uiText(locale, 'Базовая ревизия', 'Base revision')}:{' '}
        {application.draft.baseRevisionId ?? '—'}
      </p>
      <p>
        {uiText(locale, 'Решение государства', 'State decision')}: {application.decision.id} ·{' '}
        {application.decision.status}
      </p>
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
      {map.data && (
        <PoliticalMap
          world={world}
          territories={map.data.territories}
          geometry={geometry}
          center={center}
          zoom={world.maxZoom ?? DEFAULT_NATIVE_ZOOM}
        />
      )}
      {map.error !== null && <Alert tone="danger">{errorMessage(map.error)}</Alert>}
      {application.review && (
        <Alert>
          {application.review.decision}: {application.review.reason}
        </Alert>
      )}
      {application.status === 'REVIEW' && (
        <>
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
              onClick={approve}
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
              'При ратификации сервер повторно проверит полномочия, базовую ревизию и конфликты под блокировкой мира. Карта выше: утверждённые территории цветом государства, предложение — жёлтым.',
              'Ratification rechecks authority, base revision and conflicts while locking the world. Above: ratified territories use state colors; the proposal is yellow.',
            )}
          </p>
        </>
      )}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </article>
  );
}
export { TerritorialAdminReview };
