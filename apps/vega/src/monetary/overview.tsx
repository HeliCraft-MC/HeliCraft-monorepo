import { monetaryLabel } from './labels';
import type { ReactElement } from 'react';
import type { StateMonetary } from '@helicraft/alhena';
import { FieldHelp, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { IssuanceStatus } from './issuance-status';
import { MonetaryPolicyHistory } from './policy-history';
import type { MonetarySection } from './model';
import styles from './monetary.module.scss';

const sectionTitles = {
  bank: 'monetary.bank',
  currency: 'monetary.currency',
  'monetary-policy': 'monetary.policy',
  issuance: 'monetary.issuance',
  'bank-finances': 'monetary.finance',
  treasury: 'monetary.treasury',
};
function MonetaryOverview({
  data,
  section,
}: Readonly<{ data: StateMonetary; section: MonetarySection }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h2>{text(sectionTitles[section])}</h2>
      {section === 'bank' && (
        <>
          <p>
            {text('monetary.bankHelp')}{' '}
            <FieldHelp label={text('monetary.bank')} content={text('monetary.bankHelp')} />
          </p>
          {data.bank === null ? (
            <p>{text('monetary.noBank')}</p>
          ) : (
            <article className={styles.card}>
              <h3>{displayText(data.bank.name, locale)}</h3>
              <p>{displayText(data.bank.description, locale)}</p>
              <strong>{monetaryLabel(text, data.bank.status)}</strong>
              <p>{text('monetary.reviewHint')}</p>
              {data.bank.reviews.map((review) => (
                <p key={review.id}>
                  {monetaryLabel(text, review.status)}: {review.reason}
                </p>
              ))}
            </article>
          )}
          <p>
            {text('monetary.independenceHelp')}{' '}
            <FieldHelp
              label={text('monetary.action')}
              content={text('monetary.independenceHelp')}
            />
          </p>
        </>
      )}
      {data.currency !== null && (
        <article className={styles.card}>
          <h3>
            {displayText(data.currency.name, locale)} · {data.currency.code}
          </h3>
          <p>{displayText(data.currency.description, locale)}</p>
          <p>{monetaryLabel(text, data.currency.status)}</p>
          <p>
            {text('monetary.bank')}: {displayText(data.bank?.name ?? {}, locale)}
          </p>
          <p>
            {text('monetary.supply')}{' '}
            <FieldHelp label={text('monetary.supply')} content={text('monetary.supplyHelp')} />
          </p>
          <div className={styles.amount}>
            <MoneyAmount
              minor={data.currency.supplyMinor}
              code={data.currency.code}
              locale={locale}
            />
          </div>
          <a href={`/currencies/${data.currency.code}`}>{text('monetary.public')}</a>
          <a href={`/app/states/${data.currency.stateId}/manage?section=monetary-policy`}>
            {text('monetary.policy')}
          </a>
        </article>
      )}
      {section !== 'bank' && data.currency === null && <p>{text('monetary.noCurrency')}</p>}
      {section === 'monetary-policy' && data.currency !== null && (
        <>
          <IssuanceStatus currency={data.currency} />
          <MonetaryPolicyHistory revisions={data.policyHistory} code={data.currency.code} />
        </>
      )}
      {(section === 'bank-finances' || section === 'treasury') && (
        <>
          <p>
            {section === 'treasury' ? text('monetary.treasuryHelp') : text('monetary.burnHelp')}{' '}
            <FieldHelp
              label={text(section === 'treasury' ? 'monetary.treasury' : 'monetary.burnMoney')}
              content={text(section === 'treasury' ? 'monetary.treasuryHelp' : 'monetary.burnHelp')}
            />
          </p>
          <div className={styles.grid}>
            {data.accounts
              .filter(
                (account) =>
                  account.kind === (section === 'treasury' ? 'TREASURY' : 'CENTRAL_BANK'),
              )
              .map((account) => (
                <article key={account.id} className={styles.card}>
                  <h3>{monetaryLabel(text, account.kind)}</h3>
                  <div className={styles.amount}>
                    <MoneyAmount
                      minor={account.balanceMinor}
                      code={
                        data.currencies.find((currency) => currency.id === account.currencyId)
                          ?.code ?? ''
                      }
                      locale={locale}
                    />
                  </div>
                  {account.reservedMinor !== undefined && (
                    <p>
                      {uiText(locale, 'В резерве', 'Reserved')}:{' '}
                      <MoneyAmount
                        minor={account.reservedMinor}
                        code={
                          data.currencies.find((currency) => currency.id === account.currencyId)
                            ?.code ?? ''
                        }
                        locale={locale}
                      />
                    </p>
                  )}
                  {account.availableMinor !== undefined && (
                    <p>
                      {uiText(locale, 'Доступно', 'Available')}:{' '}
                      <MoneyAmount
                        minor={account.availableMinor}
                        code={
                          data.currencies.find((currency) => currency.id === account.currencyId)
                            ?.code ?? ''
                        }
                        locale={locale}
                      />
                    </p>
                  )}
                </article>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
export { MonetaryOverview };
