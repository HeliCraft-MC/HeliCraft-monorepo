import { useCallback, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { LocalizedInput, TerritoryDraftInput } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { LocalizedForm } from '../localized-form';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

const changes: readonly { value: TerritoryDraftInput['change']; ru: string; en: string }[] = [
  { value: 'INITIAL', ru: 'Первая территория', en: 'First territory' },
  { value: 'EXPAND', ru: 'Расширение', en: 'Expansion' },
  { value: 'REDUCE', ru: 'Сокращение', en: 'Reduction' },
  { value: 'RESHAPE', ru: 'Изменение формы', en: 'Reshape' },
];
function EditorFields({
  reason,
  change,
  onReason,
  onChange,
}: Readonly<{
  reason: LocalizedInput;
  change: TerritoryDraftInput['change'];
  onReason: (reason: LocalizedInput) => void;
  onChange: (change: TerritoryDraftInput['change']) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const fields = useMemo(
    () => [
      {
        name: 'reason',
        label: uiText(locale, 'Обоснование изменения', 'Reason for this change'),
        value: reason,
        multiline: true,
        onChange: onReason,
      },
    ],
    [locale, onReason, reason],
  );
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const selected = changes.find((item) => item.value === event.currentTarget.value);
      if (selected) {
        onChange(selected.value);
      }
    },
    [onChange],
  );
  return (
    <>
      <FormField label={uiText(locale, 'Тип изменения', 'Change type')} htmlFor="territory-change">
        <Select id="territory-change" value={change} onChange={select}>
          {changes.map((item) => (
            <option key={item.value} value={item.value}>
              {uiText(locale, item.ru, item.en)}
            </option>
          ))}
        </Select>
      </FormField>
      <LocalizedForm fields={fields} />
    </>
  );
}
export { EditorFields };
