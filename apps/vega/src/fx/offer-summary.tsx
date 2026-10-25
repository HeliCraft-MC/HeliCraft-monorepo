import type { ReactElement } from 'react';
import type { FxOffer } from '@helicraft/alhena';
import { FieldHelp, MoneyAmount } from '@helicraft/atria';
import { StateName } from '../state-name';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';
import { FxOfferLimits } from './offer-limits';

const statuses: Readonly<Record<FxOffer['status'], readonly [string, string]>> = {
  ACTIVE: ['Действует', 'Active'],
  FILLED: ['Полностью исполнено', 'Filled'],
  CANCELLED: ['Отменено', 'Cancelled'],
  EXPIRED: ['Срок истёк', 'Expired'],
};
function OfferSummary({ offer }: Readonly<{ offer: FxOffer }>): ReactElement {
  const { locale } = useTranslation();
  const receive = offer.currencies.find(
    (currency) => currency.id === offer.terms.receiveCurrencyId,
  );
  const provide = offer.currencies.find(
    (currency) => currency.id === offer.terms.provideCurrencyId,
  );
  return (
    <article className={styles.card}>
      <h2>
        {displayText(offer.bank.name, locale)} ·{' '}
        <StateName id={offer.bank.stateId} name={displayText(offer.bank.stateName, locale)} />
      </h2>
      <p>{uiText(locale, ...statuses[offer.status])}</p>
      <p>
        {uiText(locale, 'За один лот вы отдаёте', 'For one lot you pay')}{' '}
        <MoneyAmount
          minor={offer.terms.receivePerLotMinor}
          code={receive?.code ?? ''}
          locale={locale}
        />{' '}
        {uiText(locale, 'и получаете', 'and receive')}{' '}
        <MoneyAmount
          minor={offer.terms.providePerLotMinor}
          code={provide?.code ?? ''}
          locale={locale}
        />
        .
      </p>
      <FieldHelp
        label={uiText(locale, 'Точный курс и лоты', 'Exact rate and lots')}
        content={uiText(
          locale,
          'Обмен выполняется целыми лотами. Обе указанные суммы умножаются на число лотов без округления. Курс определил банк; общего серверного курса нет.',
          'Exchange uses whole lots. Both amounts are multiplied by the number of lots without rounding. The bank sets these terms; there is no global server exchange rate.',
        )}
      />
      <dl className={styles.facts}>
        <FxOfferLimits offer={offer} />
        <div>
          <dt>{uiText(locale, 'Минимум лотов', 'Minimum lots')}</dt>
          <dd>{offer.terms.minimumLots}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Доступно лотов', 'Remaining lots')}</dt>
          <dd>
            {offer.remainingLots} / {offer.terms.totalLots}
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Валютный резерв', 'Reserved currency')}</dt>
          <dd>
            <MoneyAmount minor={offer.reservedMinor} code={provide?.code ?? ''} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Опубликовано', 'Published')}</dt>
          <dd>
            <time dateTime={offer.createdAt}>
              {new Date(offer.createdAt).toLocaleString(locale, { timeZone: 'UTC' })} UTC
            </time>
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Действует до', 'Expires')}</dt>
          <dd>
            <time dateTime={offer.terms.expiresAt}>
              {new Date(offer.terms.expiresAt).toLocaleString(locale, { timeZone: 'UTC' })} UTC
            </time>
          </dd>
        </div>
      </dl>
      {!offer.executable && offer.status === 'ACTIVE' && (
        <p>
          {uiText(
            locale,
            'Обмен временно недоступен: проверьте статус банка, валют и минимальный объём.',
            'Exchange is temporarily unavailable; check bank and currency status and minimum volume.',
          )}
        </p>
      )}
      <details>
        <summary>
          {uiText(
            locale,
            'Неизменяемые условия и основание',
            'Immutable terms and authority source',
          )}
        </summary>
        <p>
          {uiText(locale, 'Хеш условий', 'Terms hash')}: {offer.termsHash}
        </p>
        <p>
          {uiText(locale, 'Распоряжение о публикации', 'Publication directive')}:{' '}
          {offer.publishDirectiveId}
        </p>
      </details>
    </article>
  );
}
export { OfferSummary };
