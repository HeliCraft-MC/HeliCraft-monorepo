import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVoting } from '@helicraft/alhena';
import { Alert, Button, Checkbox, FieldHelp } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { VotingBallot } from '../states/voting-ballot';
import { useExpired } from '../use-expired';

interface EntityBallot {
  kind: 'VOTE_AS_SHAREHOLDER';
  votingId: string;
  choices: string[];
  abstain: boolean;
}
function EntityVotingForm({
  ownerId,
  votingId,
  onReview,
}: Readonly<{
  ownerId: string;
  votingId: string;
  onReview: (ballot: EntityBallot) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [choices, setChoices] = useState<string[]>([]);
  const [abstain, setAbstain] = useState(false);
  const query = useQuery({
    queryKey: ['entity-ballot', votingId, ownerId],
    queryFn: async () => {
      const result = await getVoting({
        client: browserClient(),
        path: { id: votingId },
        throwOnError: true,
      });
      return result.data;
    },
    refetchInterval: 15_000,
  });
  const expired = useExpired(query.data?.input.closesAt);
  const participant = query.data?.entityVoters?.find((voter) => voter.owner.id === ownerId);
  const unavailable =
    query.data?.status !== 'OPEN' || participant === undefined || participant.hasVoted || expired;
  const changeAbstain = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setAbstain(event.currentTarget.checked);
  }, []);
  const review = useCallback((): void => {
    onReview({ kind: 'VOTE_AS_SHAREHOLDER', votingId, choices: abstain ? [] : choices, abstain });
  }, [onReview, votingId, choices, abstain]);
  return (
    <section>
      <h3>{uiText(locale, 'Голосование от юридического лица', 'Legal entity voting')}</h3>
      <FieldHelp
        label={uiText(locale, 'Отдельное решение владельца', 'Separate owner decision')}
        content={uiText(
          locale,
          'Вес акций и состав избирателей закреплены при открытии голосования. Это форма подготовки решения вашего юридического лица. Голос попадёт в целевое голосование только после одобрения и исполнения этого решения до установленного срока.',
          'Share weight and voters were frozen when the vote opened. This form prepares your legal entity’s own decision. Its ballot enters the target vote only after that decision is approved and executed before the deadline.',
        )}
      />
      {query.isPending && <p>{uiText(locale, 'Загрузка голосования…', 'Loading voting…')}</p>}
      {query.data !== undefined && (
        <>
          <h4>{displayText(query.data.input.title, locale)}</h4>
          <p>{displayText(query.data.input.description, locale)}</p>
          <p>
            {uiText(locale, 'Голосование до', 'Voting closes at')}:{' '}
            <time dateTime={query.data.input.closesAt}>
              {new Date(query.data.input.closesAt).toLocaleString(locale)}
            </time>
          </p>
          {participant !== undefined && (
            <p>
              {uiText(locale, 'Зафиксированный вес акций', 'Frozen share weight')}:{' '}
              {participant.weight} ·{' '}
              {participant.hasVoted
                ? uiText(locale, 'Голос принят', 'Ballot recorded')
                : uiText(locale, 'Голос ещё не подан', 'No ballot recorded')}
            </p>
          )}
          {participant === undefined && (
            <Alert>
              {uiText(
                locale,
                'Нет полномочия представлять юридическое лицо в этом голосовании.',
                'You cannot represent this legal entity in this vote.',
              )}
            </Alert>
          )}
          <VotingBallot
            input={query.data.input}
            choices={choices}
            onChange={setChoices}
            disabled={unavailable || abstain}
          />
          <Checkbox
            label={uiText(locale, 'Воздержаться', 'Abstain')}
            checked={abstain}
            onChange={changeAbstain}
            disabled={unavailable}
          />
          <Button onClick={review} disabled={unavailable || (!abstain && choices.length === 0)}>
            {uiText(locale, 'Проверить решение о голосовании', 'Review voting decision')}
          </Button>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { EntityVotingForm, type EntityBallot };
