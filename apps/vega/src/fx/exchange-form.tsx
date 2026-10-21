// oxlint-disable import/max-dependencies -- Exact exchange forms snapshot the published bank identity, immutable quote and idempotency key before confirmation.
import { useCallback, useId, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFxQuote, fillFxOffer } from '@helicraft/alhena';
import type { FxOffer, FxExchangeReceipt } from '@helicraft/alhena';
import { Alert, Button, FieldHelp, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { fxLots } from './form';
import { FxQuoteReview } from './quote-review';
import type { QuotedFx } from './quote-review';
import { FxReceipt } from './receipt';
import styles from '../monetary/monetary.module.scss';

function ExchangeForm({
  offer,
  onSaved,
}: Readonly<{ offer: FxOffer; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const [review, setReview] = useState<QuotedFx | null>(null);
  const [problem, setProblem] = useState('');
  const [receipt, setReceipt] = useState<FxExchangeReceipt | null>(null);
  const preview = useMutation({
    mutationFn: async (input: { offer: FxOffer; lots: string }): Promise<QuotedFx> => {
      const result = await createFxQuote({
        client: browserClient(),
        path: { id: input.offer.id },
        body: { lots: input.lots },
        throwOnError: true,
      });
      if (result.data.termsHash !== input.offer.termsHash) {
        throw new Error(
          uiText(
            locale,
            'Условия изменились. Обновите предложение.',
            'Terms changed. Refresh the offer.',
          ),
        );
      }
      return { offer: input.offer, quote: result.data, key: crypto.randomUUID() };
    },
    onSuccess: setReview,
  });
  const mutation = useMutation({
    mutationFn: async (input: QuotedFx) => {
      const result = await fillFxOffer({
        client: browserClient(),
        path: { id: input.offer.id },
        body: { quoteId: input.quote.id, idempotencyKey: input.key },
        throwOnError: true,
      });
      return result.data;
    },
    onSuccess: (result) => {
      setReceipt(result);
      setReview(null);
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['fx-history'] });
      onSaved();
    },
  });
  const { mutate: calculate } = preview;
  const { mutate: execute } = mutation;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const lots = fxLots(new FormData(event.currentTarget));
        calculate({ offer: structuredClone(offer), lots });
        setProblem('');
      } catch {
        setProblem(
          uiText(
            locale,
            'Введите положительное целое число лотов.',
            'Enter a positive whole number of lots.',
          ),
        );
      }
    },
    [offer, calculate, locale],
  );
  const confirm = useCallback((): void => {
    if (review !== null) {
      execute(review);
    }
  }, [review, execute]);
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !mutation.isPending) {
        setReview(null);
      }
    },
    [mutation.isPending],
  );
  return (
    <section className={styles.panel}>
      {receipt !== null && <FxReceipt receipt={receipt} />}
      <form onSubmit={submit} className={styles.form}>
        <FormField
          label={uiText(locale, 'Количество лотов', 'Number of lots')}
          htmlFor={id}
          help={uiText(
            locale,
            'Обе суммы будут умножены на это целое число без округления.',
            'Both amounts will be multiplied by this whole number without rounding.',
          )}
        >
          <TextField
            id={id}
            name="lots"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            maxLength={30}
            defaultValue={offer.terms.minimumLots}
            required
          />
        </FormField>
        <FieldHelp
          label={uiText(locale, 'Атомарный обмен', 'Atomic exchange')}
          content={uiText(
            locale,
            'Если не хватает средств или доступного резерва, не проводится ни одна из двух частей. Предварительный расчёт не списывает деньги.',
            'If funds or the reserved offer volume are insufficient, neither side settles. Requesting a quote does not spend money.',
          )}
        />
        <Button
          type="submit"
          disabled={preview.isPending || mutation.isPending || !offer.executable}
        >
          {preview.isPending
            ? uiText(locale, 'Расчёт…', 'Calculating…')
            : uiText(locale, 'Рассчитать обмен', 'Calculate exchange')}
        </Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
        {preview.error !== null && <Alert tone="danger">{errorMessage(preview.error)}</Alert>}
      </form>
      <FxQuoteReview
        review={review}
        pending={mutation.isPending}
        error={mutation.error}
        onConfirm={confirm}
        onOpenChange={changeOpen}
      />
    </section>
  );
}
export { ExchangeForm };
