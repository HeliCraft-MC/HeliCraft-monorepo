import { useState, useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { castVotingBallot } from '@helicraft/alhena';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { usePropCache } from './use-prop-cache';
import { VotingBallot } from './voting-ballot';

function VotingParticipation({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement {
  const { locale } = useTranslation();
  const [choices, setChoices] = useState<string[]>([]);
  const [abstain, setAbstain] = useState(false);
  const queryClient = useQueryClient();
  const cast = useMutation({
    mutationFn: async () => {
      await castVotingBallot({
        client: browserClient(),
        path: { id: voting.id },
        body: { choices: abstain ? [] : choices, abstain },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['voting', voting.id] });
    },
  });
  const scope = useMemo(() => [cast.mutate], [cast.mutate]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const check = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  return (
    <>
      <fieldset disabled={cast.isPending}>
        <legend>{uiText(locale, 'Ваш голос', 'Your ballot')}</legend>
        <VotingBallot
          input={voting.input}
          choices={choices}
          onChange={setChoices}
          disabled={abstain}
        />
        {voting.input.rules.allowAbstain && (
          <Checkbox
            label={uiText(locale, 'Воздержаться', 'Abstain')}
            checked={abstain}
            onChange={check('abstain', (event) => {
              setAbstain(event.currentTarget.checked);
            })}
          />
        )}
        <Button
          disabled={
            !abstain &&
            (voting.input.questions === undefined
              ? choices.length === 0
              : voting.input.questions.some(
                  (question) => !question.optionIds.some((optionId) => choices.includes(optionId)),
                ))
          }
          onClick={click('cast', () => {
            cast.mutate();
          })}
        >
          {uiText(locale, 'Проголосовать', 'Vote')}
        </Button>
      </fieldset>
      {cast.isError && <Alert tone="danger">{errorMessage(cast.error)}</Alert>}
    </>
  );
}
export { VotingParticipation };
