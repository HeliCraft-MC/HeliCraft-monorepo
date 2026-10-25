// oxlint-disable import/max-dependencies -- The workspace composes treaty forms, state decisions and shared platform controls.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateDiplomacy } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { LoadingState, Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { MonetaryPagination } from '../monetary/pagination';
import { DirectiveList } from '../monetary/directive-list';
import { TreatyWizard } from './wizard';
import { TreatyCard } from './card';
import styles from '../monetary/monetary.module.scss';

function DiplomacyWorkspace({
  state,
  actorId,
}: Readonly<{ state: StateDetail; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['diplomacy', state.id, page],
    queryFn: async () => {
      const result = await getStateDiplomacy({
        client: browserClient(),
        path: { stateId: state.id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    setPage(1);
    void refetch();
  }, [refetch]);
  if (query.isPending) {
    return <LoadingState label={uiText(locale, 'Загрузка дипломатии…', 'Loading diplomacy…')} />;
  }
  if (query.data === undefined) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  return (
    <section className={styles.panel}>
      <h2>{uiText(locale, 'Дипломатия', 'Diplomacy')}</h2>
      <p>
        {uiText(
          locale,
          'Каждая сторона утверждает одну и ту же редакцию через собственные должности и голосования. Налоги меняются только после двух действительных ратификаций.',
          'Each state approves the same revision through its own offices and voting. Taxation changes only after two valid ratifications.',
        )}
      </p>
      {state.configuration.governance.policies.some((policy) => policy.action === 'SIGN_TREATY') ? (
        !economicAuthority(state, actorId, 'RATIFY_TREATY') && (
          <Alert>
            {uiText(
              locale,
              'Процедура подписания договоров настроена, но ваша должность не входит в число уполномоченных. Требования указаны в разделе «Устройство и должности».',
              'A treaty signing procedure exists, but your office is not authorized. See Government and offices for the requirements.',
            )}
          </Alert>
        )
      ) : (
        <Alert>
          {uiText(
            locale,
            'Подписание договоров недоступно: процедура не настроена. Создайте реформу в разделе «Устройство и должности» → «Государственные решения» → «Подписание договоров» и укажите, кто утверждает договор. Название должности само по себе не даёт полномочий.',
            'Treaty signing is unavailable because no procedure is configured. Create a reform under Government and offices → State decisions → Treaty signing and choose who approves treaties. An office title alone grants no authority.',
          )}
        </Alert>
      )}
      {economicAuthority(state, actorId, 'RATIFY_TREATY') && (
        <TreatyWizard stateId={state.id} onSaved={refresh} />
      )}
      {query.data.items.length === 0 && (
        <p>
          {uiText(
            locale,
            'Договоров пока нет. Настройте дипломатическую процедуру через реформу, затем выберите партнёра.',
            'No treaties yet. Configure diplomatic authority through a reform, then select a partner.',
          )}
        </p>
      )}
      {query.data.items.map((treaty) => (
        <TreatyCard
          key={`${treaty.id}:${treaty.currentRevisionId}`}
          treaty={treaty}
          state={state}
          actorId={actorId}
          onSaved={refresh}
        />
      ))}
      <DirectiveList
        items={query.data.directives}
        state={state}
        actorId={actorId}
        onSaved={refresh}
      />
      <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      <a href="/treaties">
        {uiText(locale, 'Публичные международные договоры', 'Public international treaties')}
      </a>
    </section>
  );
}
export { DiplomacyWorkspace };
