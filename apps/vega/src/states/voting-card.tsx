// oxlint-disable import/max-dependencies -- The voting card composes the shared voting and survey controls over one SDK read model.
import { VotingSubjectDetails } from './voting-subject-details';
import { VotingSummary } from './voting-summary';
import { EntityVotingLinks } from '../companies/entity-voting-links';
import { VotingResults } from './voting-results';
import { VotingDraftEditor } from './voting-draft-editor';
import { VotingAdminActions } from './voting-admin-actions';
import { VotingParticipationPanel } from './voting-participation-panel';
import { SurveyAdminActions } from '../surveys/admin-actions';
import { SurveyStatistics } from '../surveys/statistics';
import { SurveyResponses } from '../surveys/responses';
import { uiText } from './text';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVoting, getAdminVoting } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';
import { VotingHeading } from './voting-heading';
import { VotingDirectoryItem } from './voting-directory-item';

function VotingCard({
  id,
  admin,
  compact = false,
}: Readonly<{ id: string; admin: boolean; compact?: boolean }>): ReactElement {
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
  if (compact) {
    return <VotingDirectoryItem voting={voting} admin={admin} />;
  }
  return (
    <section className={styles.card}>
      <VotingHeading voting={voting} />
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
      {admin && voting.status === 'DRAFT' && voting.subject === null && (
        <VotingDraftEditor id={id} input={voting.input} />
      )}
      <VotingSubjectDetails subject={voting.subject} votingId={id} />
      <EntityVotingLinks voting={voting} />
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
