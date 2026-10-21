import type { ReactElement } from 'react';
import type { FxDecisionDisplay } from '@helicraft/alhena';
import { Alert, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import type { FxPayload } from './model';

function FxPayloadSummary({
  payload,
  display,
}: Readonly<{ payload: FxPayload; display: FxDecisionDisplay | undefined }>): ReactElement {
  const { locale } = useTranslation();
  if (display === undefined) {
    return (
      <Alert tone="danger">
        {uiText(
          locale,
          'Официальные сведения о сторонах и валютах недоступны.',
          'Official bank and currency identities are unavailable.',
        )}
      </Alert>
    );
  }
  if (payload.kind === 'CANCEL_FX_OFFER') {
    return (
      <p>
        <a href={`/exchange/${payload.offerId}`}>
          {uiText(
            locale,
            'Отменить это неизменяемое предложение и освободить его неиспользованный резерв.',
            'Cancel this immutable offer and release its unused reserve.',
          )}
        </a>
      </p>
    );
  }
  if (payload.kind === 'APPROVE_INTERBANK_EXCHANGE') {
    return (
      <section>
        <p>
          {uiText(
            locale,
            'Каждая сторона утверждает эти же точные условия своим Governance. Обмен выполняется после действительного утверждения обеих сторон.',
            'Each party approves these exact terms through its own Governance. The trade settles after valid approval by both parties.',
          )}
        </p>
        {[payload.terms.first, payload.terms.second].map((leg) => (
          <p key={leg.bankId}>
            {displayText(display.banks.find((bank) => bank.id === leg.bankId)?.name ?? {}, locale)}{' '}
            ·{' '}
            {displayText(
              display.banks.find((bank) => bank.id === leg.bankId)?.stateName ?? {},
              locale,
            )}
            :{' '}
            <MoneyAmount
              minor={leg.amountMinor}
              code={
                display.currencies.find((currency) => currency.id === leg.currencyId)?.code ?? ''
              }
              locale={locale}
            />
          </p>
        ))}
        <time dateTime={payload.terms.expiresAt}>
          {new Date(payload.terms.expiresAt).toLocaleString(locale)}
        </time>
      </section>
    );
  }
  return (
    <section>
      <p>
        {uiText(locale, 'Банк получает за лот', 'Bank receives per lot')}:{' '}
        <MoneyAmount
          minor={payload.terms.receivePerLotMinor}
          code={
            display.currencies.find((currency) => currency.id === payload.terms.receiveCurrencyId)
              ?.code ?? ''
          }
          locale={locale}
        />
      </p>
      <p>
        {uiText(locale, 'Банк отдаёт за лот', 'Bank provides per lot')}:{' '}
        <MoneyAmount
          minor={payload.terms.providePerLotMinor}
          code={
            display.currencies.find((currency) => currency.id === payload.terms.provideCurrencyId)
              ?.code ?? ''
          }
          locale={locale}
        />
      </p>
      <p>
        {uiText(locale, 'Минимум лотов', 'Minimum lots')}: {payload.terms.minimumLots};{' '}
        {uiText(locale, 'Всего лотов', 'Total lots')}: {payload.terms.totalLots}
      </p>
      <p>
        {uiText(locale, 'Будет зарезервировано', 'Amount to reserve')}:{' '}
        <MoneyAmount
          minor={(
            BigInt(payload.terms.providePerLotMinor) * BigInt(payload.terms.totalLots)
          ).toString()}
          code={
            display.currencies.find((currency) => currency.id === payload.terms.provideCurrencyId)
              ?.code ?? ''
          }
          locale={locale}
        />
      </p>
      <time dateTime={payload.terms.expiresAt}>
        {new Date(payload.terms.expiresAt).toLocaleString(locale)}
      </time>
    </section>
  );
}
export { FxPayloadSummary };
