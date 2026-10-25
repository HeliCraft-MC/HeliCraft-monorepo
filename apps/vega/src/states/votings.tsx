import { uiText } from './text';
import { VotingCard } from './voting-card';
import { PollCreateDialog } from './poll-create-dialog';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listVotings, listAdminVotings } from '@helicraft/alhena';
import { Alert, EmptyState, PageHeader, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function VotingsPage({
  admin = false,
  votingId,
}: Readonly<{ admin?: boolean; votingId?: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['votings', admin],
    enabled: votingId === undefined,
    queryFn: async () => {
      const result = await (admin ? listAdminVotings : listVotings)({
        client: browserClient(),
        throwOnError: true,
      });
      return result.data.ids;
    },
  });
  const actions = useMemo(() => {
    if (votingId !== undefined) {
      return (
        <ActionLink href={admin ? '/admin/votings' : '/app/votings'}>
          {uiText(locale, 'Все голосования', 'All votes')}
        </ActionLink>
      );
    }
    return admin ? <PollCreateDialog /> : undefined;
  }, [admin, votingId, locale]);
  const ids = votingId === undefined ? (query.data ?? []) : [votingId];
  return (
    <section className={styles.page}>
      <PageHeader
        title={uiText(locale, 'Голосования', 'Voting')}
        description={uiText(
          locale,
          'Опросы и решения сообщества. Откройте голосование, чтобы ответить или посмотреть результаты.',
          'Community polls and decisions. Open a vote to respond or review results.',
        )}
        actions={actions}
      />
      {votingId === undefined && query.isPending && (
        <output>{uiText(locale, 'Загрузка голосований…', 'Loading votes…')}</output>
      )}
      {votingId === undefined && query.data?.length === 0 && (
        <EmptyState title={uiText(locale, 'Пока нет голосований', 'No votes yet')}>
          {uiText(locale, 'Доступные опросы появятся здесь.', 'Available polls will appear here.')}
        </EmptyState>
      )}
      {ids.map((id) => (
        <VotingCard key={id} id={id} admin={admin} compact={votingId === undefined} />
      ))}
      {query.isError && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { VotingsPage };
