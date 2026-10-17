// oxlint-disable import/max-dependencies -- State workspace composition connects the shared identity preview, section navigation and typed state actions.
import { StateName } from '../state-name';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createStateReformDraft, getOwnedState } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import { ManagementSections, MANAGEMENT_SECTIONS } from './management-sections';
import type { ManagementSection } from './management-sections';
import styles from './management.module.scss';

const labels = {
  overview: ['Обзор', 'Overview'],
  identity: ['Государство', 'State identity'],
  government: ['Должности', 'Offices'],
  constitution: ['Конституция', 'Constitution'],
  appointments: ['Назначения', 'Appointments'],
  proposals: ['Предложения и голосования', 'Proposals and voting'],
  citizenship: ['Моё гражданство', 'My citizenship'],
  history: ['История', 'History'],
  bank: ['Центральный банк', 'Central bank'],
  currency: ['Валюта', 'Currency'],
  'monetary-policy': ['Денежная политика', 'Monetary policy'],
  issuance: ['Эмиссия', 'Issuance'],
  'bank-finances': ['Банковские финансы', 'Bank finances'],
  treasury: ['Казна', 'Treasury'],
  taxation: ['Налоговая система', 'Taxation'],
  diplomacy: ['Дипломатия', 'Diplomacy'],
} as const;
function StateManagementPanel({
  stateId,
  actorId,
  section,
}: Readonly<{ stateId: string; actorId: string; section: ManagementSection }>): ReactElement {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const state = useQuery({
    queryKey: ['owned-state', stateId, locale],
    queryFn: async () => {
      const result = await getOwnedState({
        client: browserClient(),
        path: { id: stateId },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const reform = useMutation({
    mutationFn: async () => {
      const result = await createStateReformDraft({
        client: browserClient(),
        path: { id: stateId },
        throwOnError: true,
      });
      await navigate({
        to: '/app/states/drafts/$draftId',
        params: { draftId: result.data.draftId },
      });
    },
  });
  const { mutate } = reform;
  const start = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section className={styles.panel}>
      <header>
        <span>{uiText(locale, 'Панель государства', 'State management')}</span>
        <h1>
          {state.data ? (
            <StateName
              name={displayText(state.data.configuration.name, locale)}
              color={state.data.configuration.color}
              slug={state.data.slug}
              href={`/app/states/${stateId}`}
            />
          ) : (
            uiText(locale, 'Государство', 'State')
          )}
        </h1>
        {state.data && (
          <p>
            {uiText(
              locale,
              state.data.holders.some((holder) => holder.userId === actorId)
                ? 'Гражданин и должностное лицо'
                : 'Гражданин',
              state.data.holders.some((holder) => holder.userId === actorId)
                ? 'Citizen and office holder'
                : 'Citizen',
            )}
          </p>
        )}
      </header>
      <div className={styles.layout}>
        <nav
          className={styles.navigation}
          aria-label={uiText(locale, 'Управление государством', 'State management')}
        >
          {MANAGEMENT_SECTIONS.map((item) => (
            <a
              key={item}
              href={`/app/states/${stateId}/manage?section=${item}`}
              aria-current={section === item ? 'page' : undefined}
            >
              {uiText(locale, labels[item][0], labels[item][1])}
            </a>
          ))}
        </nav>
        <div className={styles.content}>
          {state.data && (
            <ManagementSections
              state={state.data}
              actorId={actorId}
              section={section}
              onReform={start}
              pending={reform.isPending}
            />
          )}
          {state.isPending && (
            <output>{uiText(locale, 'Загрузка государства…', 'Loading state…')}</output>
          )}
          {state.error !== null && <Alert tone="danger">{errorMessage(state.error)}</Alert>}
          {reform.error !== null && <Alert tone="danger">{errorMessage(reform.error)}</Alert>}
        </div>
      </div>
    </section>
  );
}
export { StateManagementPanel };
