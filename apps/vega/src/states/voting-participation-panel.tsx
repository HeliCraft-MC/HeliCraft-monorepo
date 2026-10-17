import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { VotingParticipation } from './voting-participation';
import { SurveyParticipation } from '../surveys/participation';
import { useTranslation } from '../i18n';
import { uiText } from './text';

function VotingParticipationPanel({
  voting,
  admin,
}: Readonly<{ voting: VotingDetail; admin: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const { survey } = voting.input;
  const canParticipate = !admin && voting.status === 'OPEN' && voting.eligible;
  return (
    <>
      {voting.hasVoted && (
        <Alert>
          {uiText(
            locale,
            survey ? 'Ваш ответ принят' : 'Ваш голос принят',
            survey ? 'Your response has been recorded' : 'Your vote has been recorded',
          )}
        </Alert>
      )}
      {canParticipate && survey && (!voting.hasVoted || !survey.oneResponsePerUser) && (
        <SurveyParticipation voting={voting} />
      )}
      {canParticipate && !survey && !voting.hasVoted && <VotingParticipation voting={voting} />}
    </>
  );
}
export { VotingParticipationPanel };
