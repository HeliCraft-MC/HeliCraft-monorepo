import { useCallback, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTerritorialApplications, listSpatialWorlds } from '@helicraft/alhena';
import { Alert, Button, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TerritorialAdminReview } from './admin-review';
import { WorldRegistration } from './world-registration';
import styles from './spatial.module.scss';

const SHORT_ID_LENGTH = 8;
function SpatialAdministration(): ReactElement {
  const { locale } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['territory-administration'],
    queryFn: async () => {
      const client = browserClient();
      const [applications, worlds] = await Promise.all([
        listTerritorialApplications({ client, throwOnError: true }),
        listSpatialWorlds({ client, throwOnError: true }),
      ]);
      return { applications: applications.data.items, worlds: worlds.data.items };
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  const select = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  const application =
    query.data?.applications.find((item) => item.id === selected) ?? query.data?.applications[0];
  const world = query.data?.worlds.find((item) => item.id === application?.draft.worldId);
  return (
    <section className={styles.panel}>
      <h1>{uiText(locale, 'Территории и миры', 'Territories and worlds')}</h1>
      <WorldRegistration onSaved={refresh} />
      <h2>{uiText(locale, 'Административная ратификация', 'Administrative ratification')}</h2>
      <p>
        {uiText(
          locale,
          'Здесь появляются только предложения, завершившие действующую государственную процедуру. Одна ратификация атомарно публикует ревизию, меняет snapshot и сохраняет историю.',
          'Only proposals that completed their current state procedure appear here. Ratification atomically publishes a revision, advances the snapshot and records history.',
        )}
      </p>
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка заявок…', 'Loading applications…')} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.applications.length === 0 && (
        <p>{uiText(locale, 'Заявок пока нет.', 'No applications yet.')}</p>
      )}
      <div className={styles.toolbar}>
        {query.data?.applications.map((item) => (
          <Button
            key={item.id}
            value={item.id}
            onClick={select}
            tone={item.id === application?.id ? 'primary' : 'quiet'}
          >
            {item.draft.stateId.slice(0, SHORT_ID_LENGTH)} · {item.status} ·{' '}
            {new Date(item.createdAt).toLocaleString(locale)}
          </Button>
        ))}
      </div>
      {application && world && (
        <TerritorialAdminReview
          key={application.id}
          application={application}
          world={world}
          onSaved={refresh}
        />
      )}
      {application && !world && (
        <Alert>
          {uiText(
            locale,
            'Мир выведен из эксплуатации; утверждение недоступно.',
            'This world has been retired; ratification is unavailable.',
          )}
        </Alert>
      )}
    </section>
  );
}
export { SpatialAdministration };
