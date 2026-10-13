import type { GovernanceVotingRules } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from './text';

function thresholdDescription(rules: Readonly<GovernanceVotingRules>, locale: Locale): string {
  switch (rules.thresholdKind) {
    case 'PERCENT': {
      return `${rules.thresholdPercent}% ${uiText(locale, 'голосов без воздержаний', 'of non-abstaining ballots')}`;
    }
    case 'SIMPLE_MAJORITY': {
      return uiText(
        locale,
        'Больше половины голосов без воздержаний',
        'More than half of non-abstaining ballots',
      );
    }
    case 'ABSOLUTE_MAJORITY': {
      return uiText(
        locale,
        'Больше половины всех избирателей',
        'More than half of all eligible voters',
      );
    }
    case 'UNANIMOUS': {
      return uiText(locale, 'Все избиратели должны одобрить', 'Every eligible voter must approve');
    }
    default: {
      throw new Error('Unknown voting threshold');
    }
  }
}
function votingDescription(rules: Readonly<GovernanceVotingRules>, locale: Locale): string {
  return `${uiText(locale, 'Кворум', 'Quorum')} ${rules.quorumPercent}% · ${thresholdDescription(rules, locale)} · ${rules.durationHours} ${uiText(locale, 'часов', 'hours')} · ${rules.allowAbstain ? uiText(locale, 'Можно воздержаться', 'Abstention allowed') : uiText(locale, 'Без воздержаний', 'No abstention')}`;
}
export { votingDescription };
