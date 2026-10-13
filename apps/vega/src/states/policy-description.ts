import type { StateConfiguration, GovernancePolicy } from '@helicraft/alhena';

import { votingDescription } from './voting-description';
import { displayText, label } from './text';
import type { Locale } from '../locales';

function policyDescription(
  policy: Readonly<GovernancePolicy>,
  configuration: Readonly<StateConfiguration>,
  locale: Locale,
): string {
  const offices = policy.officeIds
    .map((id) => configuration.governance.offices.find((office) => office.id === id))
    .flatMap((office) => (office ? [displayText(office.name, locale)] : []));
  const vote = policy.vote ?? configuration.governance.votingDefaults;
  const voting = ['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(policy.mechanism)
    ? ` · ${votingDescription(vote, locale)}`
    : '';
  return `${label(policy.mechanism, locale)}${offices.length > 0 ? `: ${offices.join(', ')}` : ''}${voting}${policy.mechanism === 'MANUAL' ? `: ${displayText(policy.manualProcedure, locale)}` : ''}`;
}
export { policyDescription };
