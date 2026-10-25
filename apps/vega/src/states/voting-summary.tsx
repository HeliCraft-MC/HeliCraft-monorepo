import type { ReactElement } from 'react';
import type { GovernanceVotingRules } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './public-detail.module.scss';

const approvalNames = {
  PERCENT: ['Указанный процент', 'Specified percentage'],
  SIMPLE_MAJORITY: ['Простое большинство', 'Simple majority'],
  ABSOLUTE_MAJORITY: ['Абсолютное большинство', 'Absolute majority'],
  UNANIMOUS: ['Единогласно', 'Unanimous'],
} as const;
function VotingSummary({ rules }: Readonly<{ rules: GovernanceVotingRules }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <dl className={styles.votingFacts}>
      <div>
        <dt>{uiText(locale, 'Досрочное завершение', 'Early completion')}</dt>
        <dd>
          {uiText(
            locale,
            rules.closeWhenDecided === true
              ? 'При неизменяемом результате или 100% явке'
              : 'При 100% явке',
            rules.closeWhenDecided === true
              ? 'Irreversible result or full turnout'
              : 'Full turnout',
          )}
        </dd>
      </div>
      <div>
        <dt>
          {uiText(locale, 'Кворум', 'Quorum')}
          <FieldHelp
            label={uiText(locale, 'Кворум', 'Quorum')}
            content={uiText(
              locale,
              'Минимальная доля избирателей, участвующих в голосовании. Воздержавшиеся учитываются; список фиксируется при открытии.',
              'Minimum participation from the electorate frozen at opening. Abstentions count towards quorum.',
            )}
          />
        </dt>
        <dd>{rules.quorumPercent}%</dd>
      </div>
      <div>
        <dt>
          {uiText(locale, 'Правило одобрения', 'Approval rule')}
          <FieldHelp
            label={uiText(locale, 'Правило одобрения', 'Approval rule')}
            content={uiText(
              locale,
              'Простое большинство — больше половины не воздержавшихся; абсолютное — больше половины всех избирателей; единогласно — все избиратели за. При равенстве большинство не достигнуто.',
              'Simple majority requires more than half of non-abstaining ballots; absolute majority more than half of all eligible voters; unanimity every eligible voter. A tie fails.',
            )}
          />
        </dt>
        <dd>
          {uiText(
            locale,
            approvalNames[rules.thresholdKind][0],
            approvalNames[rules.thresholdKind][1],
          )}
        </dd>
      </div>
      {rules.thresholdKind === 'PERCENT' && (
        <div>
          <dt>
            {uiText(locale, 'Порог одобрения', 'Approval threshold')}
            <FieldHelp
              label={uiText(locale, 'Порог одобрения', 'Approval threshold')}
              content={uiText(
                locale,
                'Доля голосов за вариант среди не воздержавшихся. Например, при пороге 60% от 50 таких голосов нужны не менее 30.',
                'Share supporting an option among non-abstaining ballots. A 60% threshold with 50 such ballots requires at least 30.',
              )}
            />
          </dt>
          <dd>{rules.thresholdPercent}%</dd>
        </div>
      )}
      <div>
        <dt>{uiText(locale, 'Максимальная продолжительность', 'Maximum duration')}</dt>
        <dd>
          {rules.durationHours} {uiText(locale, 'часов', 'hours')}
        </dd>
      </div>
      <div>
        <dt>{uiText(locale, 'Можно воздержаться', 'Abstention allowed')}</dt>
        <dd>
          {uiText(locale, rules.allowAbstain ? 'Да' : 'Нет', rules.allowAbstain ? 'Yes' : 'No')}
        </dd>
      </div>
    </dl>
  );
}
export { VotingSummary };
