// oxlint-disable import/max-dependencies -- The voting card composes ballot, result, proposal and administrative controls over the shared SDK.
import { VotingAdminActions } from './voting-admin-actions';
import { ReformProposal } from './reform-proposal';
import { uiText, displayText, label } from './text';
import { useMemo, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVoting, getAdminVoting, castVotingBallot } from '@helicraft/alhena';

import { Alert, Button, Checkbox } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';

import styles from './states.module.scss';

function VotingCard({ id, admin }: Readonly<{ id: string; admin: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const [choices, setChoices] = useState<string[]>([]);
  const [abstain, setAbstain] = useState(false);
  const queryClient = useQueryClient();
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
  });
  const cast = useMutation({
    mutationFn: async () => {
      await castVotingBallot({
        client: browserClient(),
        path: { id },
        body: { choices: abstain ? [] : choices, abstain },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['voting', id] });
    },
  });
  const callbackScope2 = useMemo(
    () => [
      id,
      admin,
      locale,
      choices,
      setChoices,
      abstain,
      setAbstain,
      queryClient,
      query.data,
      query.error,
      cast.mutate,
    ],
    [
      id,
      admin,
      locale,
      choices,
      setChoices,
      abstain,
      setAbstain,
      queryClient,
      query.data,
      query.error,
      cast.mutate,
    ],
  );
  const cacheCheckboxOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(callbackScope2);
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope2);
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка голосования…', 'Loading voting…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const voting = query.data;
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
        <time dateTime={voting.input.closesAt}>
          {new Date(voting.input.closesAt).toLocaleString(locale)}
        </time>
      </p>
      {admin && <VotingAdminActions id={id} status={voting.status} />}
      {voting.subject?.type === 'STATE_REFORM' && <ReformProposal votingId={id} />}
      {voting.hasVoted && (
        <Alert>{uiText(locale, 'Ваш голос принят', 'Your vote has been recorded')}</Alert>
      )}
      {!admin && voting.status === 'OPEN' && voting.eligible && !voting.hasVoted && (
        <fieldset disabled={cast.isPending}>
          <legend>{uiText(locale, 'Ваш голос', 'Your ballot')}</legend>
          {voting.input.options.map((option) => (
            <Checkbox
              key={option.id}
              label={displayText(option.label, locale)}
              disabled={abstain}
              checked={choices.includes(option.id)}
              onChange={cacheCheckboxOnChange(rowKey('8625', option), (event) => {
                if (!event.currentTarget.checked) {
                  setChoices(choices.filter((item) => item !== option.id));
                } else if (voting.input.maxSelections === 1) {
                  setChoices([option.id]);
                } else {
                  setChoices([...choices, option.id]);
                }
              })}
            />
          ))}
          {voting.input.rules.allowAbstain && (
            <Checkbox
              label={uiText(locale, 'Воздержаться', 'Abstain')}
              checked={abstain}
              onChange={cacheCheckboxOnChange('9179', (event) => {
                setAbstain(event.currentTarget.checked);
              })}
            />
          )}
          <Button
            disabled={!abstain && choices.length === 0}
            onClick={cacheButtonOnClick('9389', () => {
              cast.mutate();
            })}
          >
            {uiText(locale, 'Проголосовать', 'Vote')}
          </Button>
        </fieldset>
      )}
      {voting.result && (
        <section>
          <h3>{uiText(locale, 'Результаты', 'Results')}</h3>
          <p>
            {uiText(locale, 'Участие', 'Participation')}: {voting.result.participating}/
            {voting.result.eligible}
          </p>
          <ul>
            {voting.result.options.map((option) => (
              <li key={option.id}>
                {displayText(
                  voting.input.options.find((item) => item.id === option.id)?.label ?? {},
                  locale,
                )}
                : {option.votes} {option.approved ? '✓' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
      {cast.error !== null && <Alert tone="danger">{errorMessage(cast.error)}</Alert>}
    </section>
  );
}
export { VotingCard };
