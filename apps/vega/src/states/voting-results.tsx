import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { VotingInput, VotingResult } from '@helicraft/alhena';
import { Icon, FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';

function VotingResults({
  input,
  result,
}: Readonly<{ input: VotingInput; result: NonNullable<VotingResult> }>): ReactElement {
  const { locale } = useTranslation();
  const groups = useMemo(
    () =>
      input.questions ?? [
        { id: 'single', title: input.title, optionIds: input.options.map((option) => option.id) },
      ],
    [input],
  );
  return (
    <section>
      <h3>{uiText(locale, 'Результаты', 'Results')}</h3>
      <p>
        {uiText(locale, 'Участие', 'Participation')}: {result.participating}/{result.eligible} ·{' '}
        {uiText(locale, 'Воздержались', 'Abstentions')}: {result.abstentions}
      </p>
      <p>
        {uiText(
          locale,
          result.quorumMet ? 'Кворум достигнут' : 'Кворум не достигнут',
          result.quorumMet ? 'Quorum met' : 'Quorum not met',
        )}
        <FieldHelp
          label={uiText(locale, 'Кворум', 'Quorum')}
          content={uiText(
            locale,
            'Для достижения кворума учитываются все участники, включая воздержавшихся, относительно списка избирателей на момент открытия.',
            'Quorum counts every participant, including abstentions, against the electorate frozen at opening.',
          )}
        />
      </p>
      {groups.map((question) => (
        <section key={question.id}>
          {input.questions !== undefined && <h4>{displayText(question.title, locale)}</h4>}
          <ul>
            {result.options
              .filter((option) => question.optionIds.includes(option.id))
              .map((option) => (
                <li key={option.id}>
                  {displayText(
                    input.options.find((item) => item.id === option.id)?.label ?? {},
                    locale,
                  )}
                  : {option.votes} {option.approved && <Icon name="check" />}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
export { VotingResults };
