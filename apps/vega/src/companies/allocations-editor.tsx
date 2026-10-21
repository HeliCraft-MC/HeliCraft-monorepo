import { useCallback, useId, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import type { CompanyConfiguration, LegalOwner } from '@helicraft/alhena';
import { Alert, Button, FieldHelp, FormField, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { CompanyOwnerPicker } from './owner-picker';
import { CompanyOwnerIdentity } from './owner-identity';

function CompanyAllocationsEditor({
  value,
  onChange,
  mode = 'FORMATION',
}: Readonly<{
  value: CompanyConfiguration;
  onChange: (configuration: CompanyConfiguration) => void;
  mode?: 'FORMATION' | 'ISSUE';
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [owner, setOwner] = useState<LegalOwner | null>(null);
  const [type, setType] = useState<LegalOwner['type']>('PLAYER');
  const [problem, setProblem] = useState(false);
  const scope = useMemo(() => ({ value, onChange }), [value, onChange]);
  const change = usePropCache<(event: ChangeEvent<HTMLInputElement>) => void>(scope);
  const click = usePropCache<() => void>(scope);
  const total = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, totalShares: event.currentTarget.value });
    },
    [value, onChange],
  );
  const add = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const shares = new FormData(event.currentTarget).get('shares');
      if (
        owner === null ||
        typeof shares !== 'string' ||
        !/^[1-9][0-9]{0,29}$/u.test(shares) ||
        value.allocations.some(
          (item) => item.owner.type === owner.type && item.owner.id === owner.id,
        )
      ) {
        setProblem(true);
        return;
      }
      onChange({ ...value, allocations: [...value.allocations, { owner, shares }] });
      setOwner(null);
      setProblem(false);
    },
    [owner, value, onChange],
  );
  const distributed = value.allocations.every((item) => /^[1-9][0-9]{0,29}$/u.test(item.shares))
    ? value.allocations.reduce((sum, item) => sum + BigInt(item.shares), 0n).toString()
    : null;
  return (
    <section>
      <FormField
        label={
          mode === 'FORMATION'
            ? uiText(locale, 'Первоначальный выпуск акций', 'Initial share issuance')
            : uiText(locale, 'Дополнительный выпуск акций', 'Additional share issuance')
        }
        htmlFor={`${id}-total`}
      >
        <TextField
          id={`${id}-total`}
          value={value.totalShares}
          onChange={total}
          inputMode="numeric"
          maxLength={30}
          pattern="[1-9][0-9]*"
        />
      </FormField>
      <FieldHelp
        label={uiText(locale, 'Собственность и согласие', 'Ownership and consent')}
        content={uiText(
          locale,
          'Сумма распределения должна точно совпадать с выпуском. Каждый игрок подтверждает собственное участие. Компания или государство соглашается отдельным решением своего Governance.',
          'Allocations must equal the exact issued total. Each player confirms their participation. A company or state consents through a separate decision of its own Governance.',
        )}
      />
      <p>
        {uiText(locale, 'Распределено', 'Allocated')}:{' '}
        {distributed ?? uiText(locale, 'Проверьте числа', 'Check quantities')} / {value.totalShares}
      </p>
      {value.allocations.map((allocation) => (
        <section key={`${allocation.owner.type}:${allocation.owner.id}`}>
          <CompanyOwnerIdentity owner={allocation.owner} />
          <FormField
            label={uiText(locale, 'Количество акций', 'Share quantity')}
            htmlFor={`${id}-${allocation.owner.id}`}
          >
            <TextField
              id={`${id}-${allocation.owner.id}`}
              value={allocation.shares}
              inputMode="numeric"
              maxLength={30}
              pattern="[1-9][0-9]*"
              onChange={change(allocation.owner.id, (event) => {
                onChange({
                  ...value,
                  allocations: value.allocations.map((item) =>
                    item === allocation ? { ...item, shares: event.currentTarget.value } : item,
                  ),
                });
              })}
            />
          </FormField>
          <Button
            onClick={click(allocation.owner.id, () => {
              onChange({
                ...value,
                allocations: value.allocations.filter((item) => item !== allocation),
              });
            })}
          >
            {uiText(locale, 'Убрать собственника', 'Remove owner')}
          </Button>
        </section>
      ))}
      <form onSubmit={add}>
        <CompanyOwnerPicker type={type} onType={setType} value={owner} onChange={setOwner} />
        <FormField
          label={uiText(locale, 'Акции нового собственника', 'New owner shares')}
          htmlFor={`${id}-new`}
        >
          <TextField
            id={`${id}-new`}
            name="shares"
            inputMode="numeric"
            maxLength={30}
            pattern="[1-9][0-9]*"
            required
          />
        </FormField>
        <Button type="submit" disabled={owner === null}>
          {uiText(locale, 'Добавить собственника', 'Add owner')}
        </Button>
        {problem && (
          <Alert tone="danger">
            {uiText(
              locale,
              'Выберите нового собственника и положительное целое число акций.',
              'Select a new owner and a positive whole share quantity.',
            )}
          </Alert>
        )}
      </form>
    </section>
  );
}
export { CompanyAllocationsEditor };
