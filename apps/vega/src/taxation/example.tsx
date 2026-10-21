import { useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { previewTaxRule } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField, MoneyAmount } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { amountFromForm } from '../monetary/model';
import { taxRuleFromForm } from './compose';

function TaxExample(): ReactElement {
  const { locale } = useTranslation();
  const example = useMutation({
    mutationFn: async (form: FormData) => {
      const principalMinor = amountFromForm(form, 'example');
      const result = await previewTaxRule({
        client: browserClient(),
        body: { amountMinor: principalMinor, rule: taxRuleFromForm(form) },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { mutate } = example;
  const calculate = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const { form } = event.currentTarget;
      if (form !== null) {
        mutate(new FormData(form));
      }
    },
    [mutate],
  );
  return (
    <section>
      <FormField
        label={uiText(locale, 'Пример перевода', 'Example transfer')}
        htmlFor="tax-example"
        help={uiText(
          locale,
          'Пример показывает только этот закон без ранее накопленного дробного остатка. Перед настоящим переводом Антарес учитывает все законы, договоры и точные остатки.',
          'This example shows this law alone without an existing fractional remainder. Before a real transfer Antares includes all laws, treaties and exact residual obligations.',
        )}
      >
        <TextField id="tax-example" name="example" defaultValue="100.00" inputMode="decimal" />
      </FormField>
      <Button type="button" onClick={calculate} disabled={example.isPending}>
        {uiText(locale, 'Рассчитать пример', 'Calculate example')}
      </Button>
      {example.data !== undefined && (
        <p>
          {uiText(locale, 'Получателю', 'Recipient')}:{' '}
          <MoneyAmount minor={example.data.recipientCreditMinor} code="" locale={locale} /> ·{' '}
          {uiText(locale, 'Налоговому получателю', 'Tax beneficiary')}:{' '}
          <MoneyAmount minor={example.data.amountMinor} code="" locale={locale} /> ·{' '}
          {uiText(locale, 'С отправителя', 'Sender debit')}:{' '}
          <MoneyAmount minor={example.data.totalDebitMinor} code="" locale={locale} /> ·{' '}
          {uiText(locale, 'Налоговая база', 'Tax base')}:{' '}
          <MoneyAmount minor={example.data.baseMinor} code="" locale={locale} />
        </p>
      )}
      {example.error !== null && <Alert tone="danger">{errorMessage(example.error)}</Alert>}
    </section>
  );
}
export { TaxExample };
