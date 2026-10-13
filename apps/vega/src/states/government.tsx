import { uiText, label } from './text';
import { votingDescription } from './voting-description';
import { EMPTY_FOUNDERS } from './empty';
import { policyDescription } from './policy-description';
import { OfficeSummary } from './office-summary';
import type { ReactElement } from 'react';
import type { StateConfiguration, StateDetail } from '@helicraft/alhena';

import { useTranslation } from '../i18n';

import styles from './states.module.scss';

function GovernmentSummary({
  configuration,
  holders,
  founders = EMPTY_FOUNDERS,
}: Readonly<{
  configuration: StateConfiguration;
  holders?: StateDetail['holders'];
  founders?: StateDetail['founders'];
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.editor}>
      <div className={styles.grid}>
        {configuration.governance.offices.map((office) => (
          <OfficeSummary
            key={office.id}
            office={office}
            configuration={configuration}
            holders={holders}
            founders={founders}
          />
        ))}
      </div>
      <h3>{uiText(locale, 'Правила голосования по умолчанию', 'Default voting rules')}</h3>
      <p>{votingDescription(configuration.governance.votingDefaults, locale)}</p>
      <h3>{uiText(locale, 'Государственные решения', 'State decisions')}</h3>
      <dl>
        {configuration.governance.policies.map((policy) => (
          <div key={policy.action} className={styles.card}>
            <dt>{label(policy.action, locale)}</dt>
            <dd>{policyDescription(policy, configuration, locale)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { GovernmentSummary };
