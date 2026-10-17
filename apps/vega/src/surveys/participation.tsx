import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { SurveyAnswer, VotingDetail } from '@helicraft/alhena';
import { castVotingBallot } from '@helicraft/alhena';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { SurveyForm } from './form';

function SurveyParticipation({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState(0);
  const cast = useMutation({
    mutationFn: async (answers: SurveyAnswer[]) => {
      await castVotingBallot({
        client: browserClient(),
        path: { id: voting.id },
        body: { choices: [], abstain: false, answers },
        throwOnError: true,
      });
      setVersion((current) => current + 1);
      await queryClient.invalidateQueries({ queryKey: ['voting', voting.id] });
    },
  });
  const { mutate } = cast;
  const submit = useCallback(
    (answers: SurveyAnswer[]): void => {
      mutate(answers);
    },
    [mutate],
  );
  return (
    <>
      <SurveyForm
        key={version}
        input={voting.input}
        pending={cast.isPending}
        onSubmit={submit}
        html={voting.surveyHtml}
      />
      {cast.isError && <Alert tone="danger">{errorMessage(cast.error)}</Alert>}
    </>
  );
}
export { SurveyParticipation };
