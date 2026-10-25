import type { ReactElement } from 'react';
import type { FxExchangeReceipt } from '@helicraft/alhena';
import { Icon, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

function FxReceipt({ receipt }: Readonly<{ receipt: FxExchangeReceipt }>): ReactElement {
  const { locale } = useTranslation();
  const receiveCode =
    receipt.currencies.find((currency) => currency.id === receipt.receiveCurrencyId)?.code ?? '';
  const provideCode =
    receipt.currencies.find((currency) => currency.id === receipt.provideCurrencyId)?.code ?? '';
  return (
    <article className={styles.card}>
      <h2>{uiText(locale, 'Обмен выполнен', 'Exchange completed')}</h2>
      <p>
        <MoneyAmount minor={receipt.receiveMinor} code={receiveCode} locale={locale} />{' '}
        <Icon name="arrowRight" />{' '}
        <MoneyAmount minor={receipt.provideMinor} code={provideCode} locale={locale} />
      </p>
      <p>
        {uiText(
          locale,
          'Обе части обмена проведены одной операцией.',
          'Both sides of the exchange settled in one operation.',
        )}
      </p>
      <time dateTime={receipt.createdAt}>{new Date(receipt.createdAt).toLocaleString(locale)}</time>
      {receipt.offerId !== null && (
        <p>
          <a href={`/exchange/${receipt.offerId}`}>
            {uiText(locale, 'Исходное предложение', 'Original offer')}
          </a>
        </p>
      )}
      <details>
        <summary>{uiText(locale, 'Подтверждение и проводки', 'Receipt and journals')}</summary>
        <p>
          {uiText(locale, 'Номер операции', 'Operation ID')}: {receipt.id}
        </p>
        <ul>
          {receipt.journals.map((journal) => (
            <li key={journal.journalId}>
              {journal.leg === 'RECEIVE' ? receiveCode : provideCode}: {journal.journalId}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
export { FxReceipt };
