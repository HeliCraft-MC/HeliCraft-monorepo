import { OperationDetails } from '../taxation/operation';
import { monetaryLabel } from './labels';
import type { ReactElement } from 'react';
import type { LedgerTransaction } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { AccountOwner } from './account-owner';
import { HistoryActors } from './history-actors';
import { uiText } from '../states/text';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

function MonetaryHistory({
  transactions,
  currencies,
  ownActorId,
  showOperationDetails = false,
}: Readonly<{
  transactions: LedgerTransaction[];
  ownActorId?: string;
  showOperationDetails?: boolean;
  currencies: readonly { id: string; code: string }[];
}>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h2>{text('monetary.history')}</h2>
      <p>{text('monetary.historyHint')}</p>
      {transactions.length === 0 && <p>{text('monetary.emptyHistory')}</p>}
      <ol className={styles.history}>
        {transactions.map((entry) => (
          <li key={entry.id} className={styles.card}>
            <div className={styles.actions}>
              <strong>{monetaryLabel(text, entry.kind)}</strong>
              <MoneyAmount
                minor={entry.amountMinor}
                code={currencies.find((currency) => currency.id === entry.currencyId)?.code ?? ''}
                locale={locale}
              />
            </div>
            <time dateTime={entry.createdAt}>
              {new Date(entry.createdAt).toLocaleString(locale)}
            </time>
            <p>
              {entry.economicOperationId !== null && entry.economicOperationId !== entry.id
                ? uiText(locale, 'Налоговое перечисление', 'Tax payment')
                : entry.purpose}
            </p>
            <details>
              <summary>{text('monetary.details')}</summary>
              {entry.economicOperationId !== null &&
                (showOperationDetails || entry.actorId === ownActorId) && (
                  <OperationDetails
                    id={entry.economicOperationId}
                    code={
                      currencies.find((currency) => currency.id === entry.currencyId)?.code ?? ''
                    }
                  />
                )}
              <dl className={styles.facts}>
                <HistoryActors entry={entry} />
                <div>
                  <dt>{text('monetary.id')}</dt>
                  <dd>{entry.id}</dd>
                </div>
                {entry.policyRevisionId !== null && (
                  <div>
                    <dt>{text('monetary.policyRevision')}</dt>
                    <dd>{entry.policyRevisionId}</dd>
                  </div>
                )}
                {entry.directiveId !== null && (
                  <div>
                    <dt>{text('monetary.directives')}</dt>
                    <dd>{entry.directiveId}</dd>
                  </div>
                )}
                {entry.companyDecisionId !== null && (
                  <div>
                    <dt>{uiText(locale, 'Корпоративное решение', 'Corporate decision')}</dt>
                    <dd>
                      <a href={`/app/company-decisions/${entry.companyDecisionId}`}>
                        {entry.companyDecisionId}
                      </a>
                    </dd>
                  </div>
                )}
                {entry.postings.map((posting) => (
                  <div key={posting.account.id}>
                    <dt>
                      {monetaryLabel(text, posting.account.kind)} ·{' '}
                      <AccountOwner account={posting.account} />
                    </dt>
                    <dd>
                      <MoneyAmount
                        minor={posting.deltaMinor}
                        code={
                          currencies.find((currency) => currency.id === entry.currencyId)?.code ??
                          ''
                        }
                        locale={locale}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
export { MonetaryHistory };
