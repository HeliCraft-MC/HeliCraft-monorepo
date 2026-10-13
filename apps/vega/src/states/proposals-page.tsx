import type { ReactElement } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listStateReformProposals, getOwnedState, createStateReformDraft } from '@helicraft/alhena';
import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, ActionLink, Button, EmptyState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { StateProposalCard } from './proposal-card';
import { uiText, displayText } from './text';
import styles from './states.module.scss';

function StateProposalsPage({
  stateId,
  actorId,
}: Readonly<{ stateId: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['state-proposals', stateId],
    queryFn: async () => {
      const result = await listStateReformProposals({
        client: browserClient(),
        path: { id: stateId },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
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
  const { mutate: createDraft } = reform;
  const create = useCallback((): void => {
    createDraft();
  }, [createDraft]);
  return (
    <section className={styles.page}>
      <ActionLink href={`/app/states/${stateId}`}>
        {uiText(locale, 'Вернуться к государству', 'Back to the state')}
      </ActionLink>
      <h1>{uiText(locale, 'Предложения о государственном устройстве', 'Governance proposals')}</h1>
      {state.data && <p>{displayText(state.data.configuration.name, locale)}</p>}
      <p>
        {uiText(
          locale,
          'Здесь граждане рассматривают проекты изменения государственного устройства. Автор готовит черновик и отправляет его на рассмотрение. Одобрение и голосование проводятся по действующей процедуре; публикация создаёт новую редакцию.',
          'Citizens review proposed governance changes here. An author prepares a draft and submits it for review. Approval and voting follow the current rules; publication creates a new revision.',
        )}
      </p>
      {state.data?.status === 'ACTIVE' && (
        <Button onClick={create} disabled={reform.isPending}>
          {uiText(locale, 'Предложить изменение', 'Propose a change')}
        </Button>
      )}
      {query.isSuccess && query.data.length === 0 && (
        <EmptyState title={uiText(locale, 'Предложений пока нет', 'No proposals yet')}>
          {uiText(
            locale,
            'Чтобы внести изменения, создайте черновик реформы. Он появится здесь после отправки на рассмотрение.',
            'Create a reform draft to suggest changes. It will appear here once submitted for review.',
          )}
        </EmptyState>
      )}
      {(query.data ?? []).map((proposal) => (
        <StateProposalCard key={proposal.id} id={proposal.id} actorId={actorId} />
      ))}
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {state.error !== null && <Alert tone="danger">{errorMessage(state.error)}</Alert>}
      {reform.error !== null && <Alert tone="danger">{errorMessage(reform.error)}</Alert>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { StateProposalsPage };
