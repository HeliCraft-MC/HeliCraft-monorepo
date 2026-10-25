import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyRegistrationApplication, getOwnedState } from '@helicraft/alhena';
import { Icon, Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { StateCompanyApplicationCard } from './state-application-card';
import styles from './companies.module.scss';

function StateRegistrationPage({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['state-registration-inbox', id, actorId, locale],
    queryFn: async () => {
      const application = await getCompanyRegistrationApplication({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const state = await getOwnedState({
        client: browserClient(),
        path: { id: application.data.stateId },
        query: { locale },
        throwOnError: true,
      });
      return { application: application.data, state: state.data };
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section className={styles.page}>
      <a href="/app/notifications">
        <Icon name="arrowLeft" /> {uiText(locale, 'Входящие согласования', 'Approval inbox')}
      </a>
      <h1>{uiText(locale, 'Рассмотрение регистрации', 'Registration review')}</h1>
      {query.isPending && <p>{uiText(locale, 'Загрузка заявки…', 'Loading application…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <StateCompanyApplicationCard
          application={query.data.application}
          state={query.data.state}
          actorId={actorId}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
export { StateRegistrationPage };
