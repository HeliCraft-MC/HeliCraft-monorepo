import { uiText } from './text';
import { VotingCard } from './voting-card';
import { PollCreateDialog } from './poll-create-dialog';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listVotings, listAdminVotings } from '@helicraft/alhena';
import { Alert, EmptyState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function VotingsPage({ admin = false }: Readonly<{ admin?: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['votings', admin],
    queryFn: async () => {
      const result = await (admin ? listAdminVotings : listVotings)({
        client: browserClient(),
        throwOnError: true,
      });
      return result.data.ids;
    },
  });
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Голосования', 'Voting')}</h1>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Анкеты сообщества и голосования по решениям. Для каждого показаны сроки; состав участников фиксируется при открытии.',
          'Community surveys and decision votes. Each shows its schedule; eligibility is frozen at opening.',
        )}
      </p>
      {admin && <PollCreateDialog />}
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка голосований…', 'Loading votes…')}</output>
      )}
      {query.data?.length === 0 && (
        <EmptyState title={uiText(locale, 'Пока нет голосований', 'No votes yet')}>
          {uiText(locale, 'Доступные опросы появятся здесь.', 'Available polls will appear here.')}
        </EmptyState>
      )}
      {(query.data ?? []).map((id) => (
        <VotingCard key={id} id={id} admin={admin} />
      ))}
      {query.isError && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { VotingsPage };
