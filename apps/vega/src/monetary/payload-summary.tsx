import { policyDescription } from '../states/policy-description';
// oxlint-disable import/max-dependencies -- Immutable economic payload review composes monetary and tax/diplomatic summaries.
import { EconomicPayload } from '../taxation/payload';
import { economicLabels } from '../taxation/model';
import { monetaryLabel } from './labels';
import type { ReactElement } from 'react';
import type {
  MonetaryDirectivePayload,
  StateConfiguration,
  PublishedCompanyIdentity,
  FxDecisionDisplay,
} from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import { FinancialRecipient } from './financial-recipient';
import { PolicySummary } from './policy-summary';
import { isFxPayload } from '../fx/model';
import { FxPayloadSummary } from '../fx/payload-summary';
import { isCompanyStatePayload } from '../companies/state-model';
import { CompanyStatePayloadSummary } from '../companies/state-payload-summary';
import styles from './monetary.module.scss';

function PayloadSummary({
  payload,
  code,
  configuration,
  company,
  fxDisplay,
}: Readonly<{
  payload: MonetaryDirectivePayload;
  code: string;
  configuration?: StateConfiguration;
  company?: PublishedCompanyIdentity;
  fxDisplay?: FxDecisionDisplay;
}>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <div className={styles.panel}>
      {economicLabels[payload.kind] === undefined && <h3>{monetaryLabel(text, payload.kind)}</h3>}
      <EconomicPayload payload={payload} />
      {isFxPayload(payload) && <FxPayloadSummary payload={payload} display={fxDisplay} />}
      {isCompanyStatePayload(payload) && <CompanyStatePayloadSummary payload={payload} />}
      {'name' in payload && (
        <>
          <strong>{displayText(payload.name, locale)}</strong>
          <p>{displayText(payload.description, locale)}</p>
        </>
      )}
      {'code' in payload && <p>{payload.code}</p>}
      {'amountMinor' in payload && (
        <>
          <MoneyAmount minor={payload.amountMinor} code={code} locale={locale} />
          <p>{payload.purpose}</p>
        </>
      )}
      {'recipient' in payload && (
        <p>
          {text('monetary.recipient')}:{' '}
          <FinancialRecipient recipient={payload.recipient} company={company} />
        </p>
      )}
      {'initialPolicies' in payload &&
        payload.initialPolicies !== undefined &&
        payload.initialPolicies.length > 0 && (
          <section>
            <h4>{uiText(locale, 'Первоначальные процедуры', 'Initial procedures')}</h4>
            <dl className={styles.panel}>
              {payload.initialPolicies.map((policy) => (
                <div key={policy.action}>
                  <dt>{label(policy.action, locale)}</dt>
                  <dd>
                    {configuration === undefined
                      ? label(policy.mechanism, locale)
                      : policyDescription(policy, configuration, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      {payload.kind === 'CHANGE_POLICY' && <PolicySummary policy={payload.policy} code={code} />}
    </div>
  );
}
export { PayloadSummary };
