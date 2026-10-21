import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyOffice } from '@helicraft/alhena';
import { Checkbox, FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

const MAX_HOLDERS = 100;
const MAX_TERM_DAYS = 36_500;
function OfficeIdentityFields({
  value,
  onChange,
}: Readonly<{ value: CompanyOffice; onChange: (office: CompanyOffice) => void }>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const name = useCallback(
    (next: CompanyOffice['name']): void => {
      onChange({ ...value, name: next });
    },
    [value, onChange],
  );
  const description = useCallback(
    (next: CompanyOffice['description']): void => {
      onChange({ ...value, description: next });
    },
    [value, onChange],
  );
  const maximum = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, maxHolders: Number(event.currentTarget.value) });
    },
    [value, onChange],
  );
  const term = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({
        ...value,
        termDays: event.currentTarget.value === '' ? null : Number(event.currentTarget.value),
      });
    },
    [value, onChange],
  );
  const required = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, required: event.currentTarget.checked });
    },
    [value, onChange],
  );
  return (
    <>
      <LocalizedInputField
        label={uiText(locale, 'Название должности', 'Office name')}
        value={value.name}
        onChange={name}
      />
      <LocalizedInputField
        label={uiText(locale, 'Описание должности', 'Office description')}
        value={value.description}
        onChange={description}
        multiline
      />
      <FormField
        label={uiText(locale, 'Максимум должностных лиц', 'Maximum office holders')}
        htmlFor={`${id}-maximum`}
      >
        <TextField
          id={`${id}-maximum`}
          type="number"
          min={1}
          max={MAX_HOLDERS}
          value={value.maxHolders}
          onChange={maximum}
        />
      </FormField>
      <FormField
        label={uiText(
          locale,
          'Срок, дней (пусто — бессрочно)',
          'Term in days (empty means indefinite)',
        )}
        htmlFor={`${id}-term`}
      >
        <TextField
          id={`${id}-term`}
          type="number"
          min={1}
          max={MAX_TERM_DAYS}
          value={value.termDays ?? ''}
          onChange={term}
        />
      </FormField>
      <Checkbox
        label={uiText(locale, 'Обязательная должность', 'Required office')}
        checked={value.required}
        onChange={required}
      />
    </>
  );
}
export { OfficeIdentityFields };
