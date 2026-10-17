import type { ReactElement } from 'react';
import type { NationalCurrency } from '@helicraft/alhena';
import { FieldHelp, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { PolicySummary } from './policy-summary';
import styles from './monetary.module.scss';

function IssuanceStatus({ currency }: Readonly<{ currency: NationalCurrency }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <section className={styles.panel}>
      {currency.policy !== null && (
        <h3>
          {text('monetary.policyRevisionNumber')} {currency.policy.number}
        </h3>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>
            {text('monetary.grossNow')}{' '}
            <FieldHelp label={text('monetary.grossNow')} content={text('monetary.maxGrossHelp')} />
          </dt>
          <dd>
            <MoneyAmount
              minor={currency.grossIssuance30dMinor}
              code={currency.code}
              locale={locale}
            />
          </dd>
        </div>
        <div>
          <dt>
            {text('monetary.remainingIssuance')}{' '}
            <FieldHelp
              label={text('monetary.remainingIssuance')}
              content={text('monetary.remainingHelp')}
            />
          </dt>
          <dd>
            <MoneyAmount
              minor={currency.remainingIssuanceMinor}
              code={currency.code}
              locale={locale}
            />
          </dd>
        </div>
        <div>
          <dt>
            {text('monetary.availableIssuance')}{' '}
            <FieldHelp
              label={text('monetary.availableIssuance')}
              content={text('monetary.availableHelp')}
            />
          </dt>
          <dd>
            <MoneyAmount
              minor={currency.availableIssuanceMinor}
              code={currency.code}
              locale={locale}
            />
          </dd>
        </div>
      </dl>
      <PolicySummary policy={currency.policy?.limits ?? null} code={currency.code} />
    </section>
  );
}
export { IssuanceStatus };
