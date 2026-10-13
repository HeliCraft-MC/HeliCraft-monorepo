import { PlayerNickname } from '../player-nickname';
import { votingDescription } from './voting-description';
import { uiText, displayText, label } from './text';
import { EMPTY_FOUNDERS } from './empty';
import type { ReactElement } from 'react';
import type { ConstitutionBlock, StateConfiguration, StateDetail } from '@helicraft/alhena';

import { useTranslation } from '../i18n';
import { GovernmentSummary } from './government';
import { OfficeSummary } from './office-summary';
import { policyDescription } from './policy-description';

function GeneratedBlock({
  block,
  configuration,
  founders = EMPTY_FOUNDERS,
}: Readonly<{
  block: Extract<ConstitutionBlock, { type: 'GENERATED' }>;
  configuration: StateConfiguration;
  founders?: StateDetail['founders'];
}>): ReactElement {
  const { locale } = useTranslation();
  const office = configuration.governance.offices.find((item) => item.id === block.officeId);
  const policy = configuration.governance.policies.find((item) => item.action === block.action);
  if (block.kind === 'GOVERNANCE_SUMMARY' || block.kind === 'OFFICES_OVERVIEW') {
    return <GovernmentSummary configuration={configuration} founders={founders} />;
  }
  if (block.kind === 'SINGLE_OFFICE' || block.kind === 'OFFICE_APPOINTMENT_RULE') {
    return office ? (
      <OfficeSummary office={office} configuration={configuration} founders={founders} />
    ) : (
      <p>{uiText(locale, 'Выберите должность', 'Choose an office')}</p>
    );
  }
  if (block.kind === 'STATE_DECISION_RULE') {
    return (
      <p>
        {policy
          ? `${label(policy.action, locale)}: ${policyDescription(policy, configuration, locale)}`
          : uiText(locale, 'Выберите процедуру', 'Choose a procedure')}
      </p>
    );
  }
  if (block.kind === 'STATE_IDENTITY') {
    return (
      <section>
        <h2>{displayText(configuration.name, locale)}</h2>
        <p>{displayText(configuration.description, locale)}</p>
      </section>
    );
  }
  if (block.kind === 'FOUNDERS') {
    return (
      <section>
        <h3>{label('FOUNDERS', locale)}</h3>
        <ul>
          {founders.map((founder) => (
            <li key={founder.id}>
              <PlayerNickname id={founder.id} name={founder.name} />
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (block.kind === 'CITIZENSHIP_RULES') {
    return (
      <p>
        {label(configuration.citizenship.entryMode, locale)} ·{' '}
        {configuration.citizenship.allowMultipleCitizenships
          ? uiText(locale, 'Несколько гражданств разрешено', 'Multiple citizenships allowed')
          : uiText(locale, 'Одно гражданство', 'Single citizenship')}
      </p>
    );
  }
  return (
    <p>
      {label('VOTING_RULES', locale)}:{' '}
      {votingDescription(configuration.governance.votingDefaults, locale)}
    </p>
  );
}
export { GeneratedBlock };
