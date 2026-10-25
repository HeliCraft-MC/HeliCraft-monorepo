import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonetaryDirective, getOwnedState } from '@helicraft/alhena';
import { Icon, Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { DirectiveCard } from '../monetary/directive-card';
import styles from './companies.module.scss';

function StateDecisionPage({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['state-decision-inbox', id, actorId, locale],
    queryFn: async () => {
      const directive = await getMonetaryDirective({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const state = await getOwnedState({
        client: browserClient(),
        path: { id: directive.data.stateId },
        query: { locale },
        throwOnError: true,
      });
      return { directive: directive.data, state: state.data };
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
      <h1>{uiText(locale, 'Решение государства', 'State decision')}</h1>
      <p>
        {uiText(
          locale,
          'Сначала одобрите решение от своей должности или примите участие в голосовании. Когда все условия выполнены, нажмите «Исполнить». Только исполненное решение меняет состояние.',
          'Approve from your office or participate in the required vote. Once all requirements are met, execute the decision. State changes take effect only after execution.',
        )}
      </p>
      {query.isPending && <p>{uiText(locale, 'Загрузка решения…', 'Loading decision…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <DirectiveCard
          directive={query.data.directive}
          state={query.data.state}
          actorId={actorId}
          code=""
          onSaved={refresh}
        />
      )}
    </section>
  );
}
export { StateDecisionPage };
