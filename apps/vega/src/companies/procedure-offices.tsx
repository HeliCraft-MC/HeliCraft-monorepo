import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyOffice } from '@helicraft/alhena';
import { Select, FormField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function ProcedureOffices({
  offices,
  value,
  single,
  onChange,
}: Readonly<{
  offices: readonly CompanyOffice[];
  value: readonly string[];
  single: boolean;
  onChange: (ids: string[]) => void;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onChange(
        Array.from(event.currentTarget.selectedOptions, (option) => option.value).filter(
          (item) => item !== '',
        ),
      );
    },
    [onChange],
  );
  const selected = useMemo(() => (single ? (value[0] ?? '') : [...value]), [single, value]);
  return (
    <FormField
      label={uiText(locale, 'Уполномоченные должности', 'Authorized offices')}
      htmlFor={id}
      help={
        single
          ? undefined
          : uiText(
              locale,
              'Можно выбрать несколько должностей с Ctrl или Command.',
              'Select several offices with Ctrl or Command.',
            )
      }
    >
      <Select id={id} multiple={!single} value={selected} onChange={change}>
        {single && (
          <option value="">{uiText(locale, 'Выберите должность', 'Choose an office')}</option>
        )}
        {offices.map((office) => (
          <option key={office.id} value={office.id}>
            {displayText(office.name, locale) || uiText(locale, 'Без названия', 'Unnamed')}
          </option>
        ))}
      </Select>
    </FormField>
  );
}
export { ProcedureOffices };
