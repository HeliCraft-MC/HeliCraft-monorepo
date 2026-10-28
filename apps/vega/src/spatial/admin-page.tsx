// oxlint-disable import/max-dependencies -- Administration composes the application queue, named state identities, immutable review and world setup.
import { useCallback, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTerritorialApplications, listSpatialWorlds } from '@helicraft/alhena';
import { Alert, Button, LoadingState, ActionPanel } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TerritorialAdminReview } from './admin-review';
import { WorldRegistration } from './world-registration';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { StateNameById } from '../state-name-by-id';
import styles from './territory-editor.module.scss';

const REFRESH_MS = 5000;
function SpatialAdministration(): ReactElement {
  const { locale, text } = useTranslation();
  const statuses = {
    REVIEW: uiText(locale, 'Ожидает ратификации', 'Awaiting ratification'),
    APPROVED: uiText(locale, 'Опубликовано', 'Published'),
    REJECTED: uiText(locale, 'Отклонено', 'Rejected'),
  };
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['territory-administration'],
    refetchInterval: REFRESH_MS,
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
    <section className={styles.workspace}>
      <h1>{uiText(locale, 'Территории и миры', 'Territories and worlds')}</h1>
      <h2>{uiText(locale, 'Административная ратификация', 'Administrative ratification')}</h2>
      <p>
        {uiText(
          locale,
          'Проверьте предложение, обоснование и решение государства. Ратификация опубликует именно эти границы на официальной карте и в Minecraft.',
          'Review the proposal, reasoning and state decision. Ratification publishes these exact boundaries on the official map and in Minecraft.',
        )}
      </p>
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка заявок…', 'Loading applications…')} />
      )}
      {query.error !== null && <Alert tone="danger">{text(errorMessage(query.error))}</Alert>}
      {query.data?.applications.length === 0 && (
        <div className={styles.empty}>
          <CheckCircle2 aria-hidden="true" />
          <h3>{uiText(locale, 'Новых заявок пока нет', 'No applications yet')}</h3>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Предложения появятся здесь после завершения государственной процедуры.',
              'Proposals appear here after completing their state procedure.',
            )}
          </p>
        </div>
      )}
      <div className={styles.draftList}>
        {query.data?.applications.map((item) => (
          <article className={styles.card} key={item.id} data-state-id={item.draft.stateId}>
            <StateNameById id={item.draft.stateId} color="#859b76" />
            <p className={styles.muted}>
              {statuses[item.status]} · {new Date(item.createdAt).toLocaleDateString(locale)}
            </p>
            <Button
              value={item.id}
              onClick={select}
              tone={item.id === application?.id ? 'primary' : 'quiet'}
              aria-pressed={item.id === application?.id}
            >
              {uiText(locale, 'Рассмотреть предложение', 'Review proposal')}
              <ArrowRight aria-hidden="true" />
            </Button>
          </article>
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
      <ActionPanel
        title={uiText(locale, 'Подключённые миры и настройка', 'Connected worlds and setup')}
      >
        <WorldRegistration onSaved={refresh} worlds={query.data?.worlds} />
      </ActionPanel>
    </section>
  );
}
export { SpatialAdministration };
