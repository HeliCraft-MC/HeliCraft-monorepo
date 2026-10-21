import { useExpired } from '../use-expired';
import type { ReactElement } from 'react';
import type { FxOffer, FxQuote } from '@helicraft/alhena';
import { Alert, Button, Dialog, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { errorMessage } from '../account-api';

interface QuotedFx {
  offer: FxOffer;
  quote: FxQuote;
  key: string;
}
function FxQuoteReview({
  review,
  pending,
  error,
  onConfirm,
  onOpenChange,
}: Readonly<{
  review: QuotedFx | null;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const expired = useExpired(review?.quote.expiresAt);
  const title = uiText(locale, 'Подтвердите обмен', 'Confirm exchange');
  return (
    <Dialog
      open={review !== null}
      onOpenChange={onOpenChange}
      title={title}
      description={uiText(
        locale,
        'Утверждённые суммы обмениваются вместе. Изменение условий потребует нового расчёта.',
        'These exact amounts settle together. Changed terms require a new quote.',
      )}
      closeLabel={uiText(locale, 'Закрыть', 'Close')}
    >
      {review !== null && (
        <>
          <p>
            {displayText(review.offer.bank.name, locale)} ·{' '}
            {displayText(review.offer.bank.stateName, locale)}
          </p>
          <p>
            {uiText(locale, 'Вы отдаёте', 'You pay')}:{' '}
            <MoneyAmount
              minor={review.quote.receiveMinor}
              code={
                review.offer.currencies.find(
                  (currency) => currency.id === review.offer.terms.receiveCurrencyId,
                )?.code ?? ''
              }
              locale={locale}
            />
          </p>
          <p>
            {uiText(locale, 'Вы получаете', 'You receive')}:{' '}
            <MoneyAmount
              minor={review.quote.provideMinor}
              code={
                review.offer.currencies.find(
                  (currency) => currency.id === review.offer.terms.provideCurrencyId,
                )?.code ?? ''
              }
              locale={locale}
            />
          </p>
          <p>
            {review.quote.lots} {uiText(locale, 'лотов', 'lots')} ·{' '}
            {uiText(locale, 'Расчёт до', 'Quote valid until')}:{' '}
            <time dateTime={review.quote.expiresAt}>
              {new Date(review.quote.expiresAt).toLocaleTimeString(locale)}
            </time>
          </p>
          {expired && (
            <Alert tone="danger">
              {uiText(
                locale,
                'Срок расчёта истёк. Закройте окно и получите новый расчёт.',
                'The quote expired. Close this dialog and request a new quote.',
              )}
            </Alert>
          )}
        </>
      )}
      <Button onClick={onConfirm} disabled={pending || expired || review === null}>
        {pending ? uiText(locale, 'Выполняется…', 'Exchanging…') : title}
      </Button>
      {error !== null && <Alert tone="danger">{errorMessage(error)}</Alert>}
    </Dialog>
  );
}
export { FxQuoteReview, type QuotedFx };
