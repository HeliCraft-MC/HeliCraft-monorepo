import type { ReactElement } from 'react';
import type { FxOffer } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function FxOfferLimits({ offer }: Readonly<{ offer: FxOffer }>): ReactElement {
  const { locale } = useTranslation();
  const payCode =
    offer.currencies.find((currency) => currency.id === offer.terms.receiveCurrencyId)?.code ?? '';
  const receiveCode =
    offer.currencies.find((currency) => currency.id === offer.terms.provideCurrencyId)?.code ?? '';
  const minimum = BigInt(offer.terms.minimumLots);
  const maximum = offer.executable ? BigInt(offer.remainingLots) : 0n;
  return (
    <>
      <div>
        <dt>{uiText(locale, 'Минимально отдаёте', 'Minimum you pay')}</dt>
        <dd>
          <MoneyAmount
            minor={(minimum * BigInt(offer.terms.receivePerLotMinor)).toString()}
            code={payCode}
            locale={locale}
          />
        </dd>
      </div>
      <div>
        <dt>{uiText(locale, 'Максимально отдаёте сейчас', 'Maximum you can pay now')}</dt>
        <dd>
          <MoneyAmount
            minor={(maximum * BigInt(offer.terms.receivePerLotMinor)).toString()}
            code={payCode}
            locale={locale}
          />
        </dd>
      </div>
      <div>
        <dt>{uiText(locale, 'Минимально получаете', 'Minimum you receive')}</dt>
        <dd>
          <MoneyAmount
            minor={(minimum * BigInt(offer.terms.providePerLotMinor)).toString()}
            code={receiveCode}
            locale={locale}
          />
        </dd>
      </div>
      <div>
        <dt>{uiText(locale, 'Максимально получаете сейчас', 'Maximum you can receive now')}</dt>
        <dd>
          <MoneyAmount
            minor={(maximum * BigInt(offer.terms.providePerLotMinor)).toString()}
            code={receiveCode}
            locale={locale}
          />
        </dd>
      </div>
    </>
  );
}
export { FxOfferLimits };
