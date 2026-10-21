import { useCallback, useId, useMemo, useState } from 'react';
import type { ComponentProps, ReactElement, SubmitEvent } from 'react';
import type {
  CompanyAuthorityPolicy,
  CompanyOffice,
  GovernanceVotingRules,
  NationalCurrency,
} from '@helicraft/alhena';
import {
  Alert,
  Button,
  FormField,
  MoneyAmount,
  TextField,
  moneyInputToMinor,
} from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { CurrencyPicker } from '../fx/currency-picker';
import { CompanyProcedureEditor } from './procedure-editor';
import { shareholderProcedure } from './charter-model';
import { CurrencyName } from './currency-name';

type Bands = CompanyAuthorityPolicy['financialBands'];
function FinancialBandsEditor({
  value,
  offices,
  defaults,
  onChange,
}: Readonly<{
  value: Bands;
  offices: readonly CompanyOffice[];
  defaults: GovernanceVotingRules;
  onChange: (bands: Bands) => void;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const [currency, setCurrency] = useState<NationalCurrency | null>(null);
  const [problem, setProblem] = useState(false);
  const scope = useMemo(() => ({ value, onChange }), [value, onChange]);
  const change =
    usePropCache<NonNullable<ComponentProps<typeof CompanyProcedureEditor>['onChange']>>(scope);
  const click = usePropCache<() => void>(scope);
  const add = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const amount = new FormData(event.currentTarget).get('bandLimit');
      const minor = typeof amount === 'string' ? moneyInputToMinor(amount) : null;
      if (
        currency === null ||
        minor === null ||
        value.some((item) => item.currencyId === currency.id && item.upToMinor === minor)
      ) {
        setProblem(true);
        return;
      }
      onChange([
        ...value,
        { currencyId: currency.id, upToMinor: minor, procedure: shareholderProcedure() },
      ]);
      setProblem(false);
    },
    [currency, value, onChange],
  );
  return (
    <section>
      <h4>{uiText(locale, 'Финансовые пороги', 'Financial bands')}</h4>
      <p>
        {uiText(
          locale,
          'Порог сравнивается со всем списанием с учётом налогов. Выбирается наименьший подходящий порог этой валюты; иначе действует основная процедура.',
          'The threshold includes the full debit and taxes. The smallest applicable threshold in that currency wins; otherwise the default procedure applies.',
        )}
      </p>
      {value.map((band) => (
        <section key={`${band.currencyId}:${band.upToMinor}`}>
          <MoneyAmount minor={band.upToMinor} code="" locale={locale} />{' '}
          <CurrencyName id={band.currencyId} />
          <CompanyProcedureEditor
            value={band.procedure}
            offices={offices}
            defaults={defaults}
            onChange={change(`${band.currencyId}:${band.upToMinor}`, (procedure) => {
              onChange(value.map((item) => (item === band ? { ...item, procedure } : item)));
            })}
          />
          <Button
            onClick={click(`${band.currencyId}:${band.upToMinor}`, () => {
              onChange(value.filter((item) => item !== band));
            })}
          >
            {uiText(locale, 'Удалить порог', 'Remove band')}
          </Button>
        </section>
      ))}
      <form onSubmit={add}>
        <CurrencyPicker
          name="bandCurrency"
          label={uiText(locale, 'Валюта порога', 'Band currency')}
          value={currency}
          onChange={setCurrency}
        />
        <FormField
          label={uiText(locale, 'Списание до (включительно)', 'Full debit up to (inclusive)')}
          htmlFor={id}
        >
          <TextField id={id} name="bandLimit" inputMode="decimal" maxLength={31} required />
        </FormField>
        <Button type="submit">{uiText(locale, 'Добавить порог', 'Add band')}</Button>
        {problem && (
          <Alert tone="danger">
            {uiText(
              locale,
              'Проверьте валюту и уникальную точную сумму.',
              'Check the currency and a unique exact amount.',
            )}
          </Alert>
        )}
      </form>
    </section>
  );
}
export { FinancialBandsEditor };
