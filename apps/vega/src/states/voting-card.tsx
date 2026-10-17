// oxlint-disable import/max-dependencies -- The voting card composes the shared voting and survey controls over one SDK read model.
import { VotingSubjectDetails } from './voting-subject-details';
import { VotingSummary } from './voting-summary';
import { VotingResults } from './voting-results';
import { VotingDraftEditor } from './voting-draft-editor';
import { VotingAdminActions } from './voting-admin-actions';
import { VotingParticipationPanel } from './voting-participation-panel';
import { SurveyAdminActions } from '../surveys/admin-actions';
import { SurveyStatistics } from '../surveys/statistics';
import { SurveyResponses } from '../surveys/responses';
import { uiText, displayText, label } from './text';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVoting, getAdminVoting } from '@helicraft/alhena';
import { Alert, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function VotingCard({ id, admin }: Readonly<{ id: string; admin: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['voting', id, admin],
    queryFn: async () => {
      const result = await (admin ? getAdminVoting : getVoting)({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
    refetchInterval: 15_000,
    retry: false,
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка голосования…', 'Loading voting…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const voting = query.data;
  const survey = voting.input.survey !== undefined;
  return (
    <section className={styles.card}>
      <h2>{displayText(voting.input.title, locale)}</h2>
      <p>{displayText(voting.input.description, locale)}</p>
      <p>
        {label(`VOTING_${voting.status}`, locale)} ·{' '}
        <time dateTime={voting.input.opensAt}>
          {new Date(voting.input.opensAt).toLocaleString(locale)}
        </time>{' '}
        —{' '}
        {voting.input.survey?.manualClose === true ? (
          uiText(locale, 'До ручного закрытия', 'Until closed manually')
        ) : (
          <time dateTime={voting.input.closesAt}>
            {new Date(voting.input.closesAt).toLocaleString(locale)}
          </time>
        )}
      </p>
      {!survey && (
        <details>
          <summary>{uiText(locale, 'Правила голосования', 'Voting rules')}</summary>
          <VotingSummary rules={voting.input.rules} />
        </details>
      )}
      {!admin && voting.status === 'OPEN' && !voting.eligible && (
        <Alert>
          {uiText(
            locale,
            'Вы не входите в список избирателей этого голосования. Список фиксируется при открытии.',
            'You are not in this vote’s electorate. The list is frozen when voting opens.',
          )}
        </Alert>
      )}
      {admin && <VotingAdminActions id={id} status={voting.status} />}
      {admin && survey && <SurveyAdminActions voting={voting} />}
      {!['DRAFT', 'ARCHIVED', 'CANCELLED'].includes(voting.status) && (
        <ActionLink href={`/app/votings/${id}`}>
          {uiText(locale, 'Открыть по ссылке', 'Open direct link')}
        </ActionLink>
      )}
      {admin && voting.status === 'DRAFT' && voting.subject === null && (
        <VotingDraftEditor id={id} input={voting.input} />
      )}
      <VotingSubjectDetails subject={voting.subject} votingId={id} />
      <VotingParticipationPanel voting={voting} admin={admin} />
      {voting.result &&
        (survey ? (
          <SurveyStatistics voting={voting} />
        ) : (
          <VotingResults input={voting.input} result={voting.result} />
        ))}
      {admin && survey && (
        <details>
          <summary>{uiText(locale, 'Просмотр ответов', 'Review responses')}</summary>
          <SurveyResponses id={id} input={voting.input} />
        </details>
      )}
    </section>
  );
}
export { VotingCard };
