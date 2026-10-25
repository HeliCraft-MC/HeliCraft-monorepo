import { monetaryLabel } from './labels';
import type { ReactElement } from 'react';
import type { PublicCurrency } from '@helicraft/alhena';
import { FieldHelp, MoneyAmount } from '@helicraft/atria';
import { StateName } from '../state-name';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { PolicySummary } from './policy-summary';
import styles from './monetary.module.scss';

function PublicCurrencyPage({ item }: Readonly<{ item: PublicCurrency }>): ReactElement {
  const { text, locale } = useTranslation();
  const { currency, bank, state, issuance } = item;
  return (
    <section className={`${styles.panel} ${styles.publicPage}`}>
      <h1>
        {displayText(currency.name, locale)} · {currency.code}
      </h1>
      <p>{displayText(currency.description, locale)}</p>
      {state.active && state.slug !== null ? (
        <StateName
          href={`/states/${state.slug}`}
          slug={state.slug}
          name={displayText(state.name ?? {}, locale)}
          color="var(--primary)"
        />
      ) : (
        <p>{text('monetary.stateInactive')}</p>
      )}
      <div className={styles.grid}>
        <article className={styles.card}>
          <h2>
            {text('monetary.supply')}{' '}
            <FieldHelp label={text('monetary.supply')} content={text('monetary.supplyHelp')} />
          </h2>
          <div className={styles.amount}>
            <MoneyAmount minor={currency.supplyMinor} code={currency.code} locale={locale} />
          </div>
          <p>{monetaryLabel(text, currency.status)}</p>
        </article>
        <article className={styles.card}>
          <h2>{text('monetary.bank')}</h2>
          <h3>{displayText(bank.name, locale)}</h3>
          <p>{displayText(bank.description, locale)}</p>
          <p>{monetaryLabel(text, bank.status)}</p>
          <p>
            {text('monetary.establishment')}:{' '}
            <time dateTime={bank.createdAt}>
              {new Date(bank.createdAt).toLocaleDateString(locale, { timeZone: 'UTC' })}
            </time>
          </p>
        </article>
      </div>
      <article className={styles.card}>
        <h2>{text('monetary.policy')}</h2>
        <PolicySummary code={currency.code} policy={currency.policy?.limits ?? null} />
        {currency.policy !== null && (
          <p>
            {text('monetary.policyRevisionNumber')} {currency.policy.number}
          </p>
        )}
      </article>
      <h2>{text('monetary.issuance')}</h2>
      {issuance.length === 0 && <p>{text('monetary.emptyHistory')}</p>}
      <ol className={styles.history}>
        {issuance.map((entry) => (
          <li key={entry.id} className={styles.card}>
            <strong>{monetaryLabel(text, entry.kind)}</strong>
            <MoneyAmount minor={entry.amountMinor} code={currency.code} locale={locale} />
            <time dateTime={entry.createdAt}>
              {new Date(entry.createdAt).toLocaleDateString(locale, { timeZone: 'UTC' })}
            </time>
            <p>
              {text('monetary.policyRevision')}: {entry.policyRevisionId ?? '—'}
            </p>
          </li>
        ))}
      </ol>
      <nav className={styles.actions} aria-label={text('monetary.history')}>
        {item.issuancePage > 1 && (
          <a href={`/currencies/${currency.code}?page=${item.issuancePage - 1}&lang=${locale}`}>
            {text('common.previous')}
          </a>
        )}
        {item.hasMoreIssuance && (
          <a href={`/currencies/${currency.code}?page=${item.issuancePage + 1}&lang=${locale}`}>
            {text('common.next')}
          </a>
        )}
      </nav>
    </section>
  );
}
export { PublicCurrencyPage };
