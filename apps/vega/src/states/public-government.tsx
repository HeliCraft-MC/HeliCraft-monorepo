import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { OfficeSummary } from './office-summary';
import { policyDescription } from './policy-description';
import { votingDescription } from './voting-description';
import { label, uiText } from './text';
import styles from './public-detail.module.scss';

function PublicGovernment({ state }: Readonly<{ state: StateDetail }>): ReactElement {
  const { locale } = useTranslation();
  const { configuration } = state;
  return (
    <>
      <div className={styles.offices}>
        {configuration.governance.offices.map((office) => (
          <OfficeSummary
            key={office.id}
            office={office}
            configuration={configuration}
            holders={state.holders}
            founders={state.founders}
          />
        ))}
      </div>
      <div className={styles.rules}>
        <section className={styles.panel}>
          <h3>{uiText(locale, 'Как принимаются решения', 'How decisions are made')}</h3>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Полномочия и порядок принятия каждого решения.',
              'Authority and procedure for each decision.',
            )}
          </p>
          {configuration.governance.policies.map((policy) => (
            <details key={policy.action} className={styles.policy}>
              <summary>{label(policy.action, locale)}</summary>
              <p>{policyDescription(policy, configuration, locale)}</p>
            </details>
          ))}
        </section>
        <section className={styles.panel}>
          <span className={styles.eyebrow}>{uiText(locale, 'Голосование', 'Voting')}</span>
          <h3>{uiText(locale, 'Общие правила', 'Default rules')}</h3>
          <p>{votingDescription(configuration.governance.votingDefaults, locale)}</p>
        </section>
      </div>
    </>
  );
}
export { PublicGovernment };
