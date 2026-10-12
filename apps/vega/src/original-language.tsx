import type { ChangeEvent, ReactElement } from 'react';
import { FormField } from '@helicraft/atria';
import { locales } from './locales';
import { useTranslation } from './i18n';

function OriginalLanguage({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}>): ReactElement {
  const { text } = useTranslation();
  return (
    <FormField label={text('translations.originalLanguage')} htmlFor="original-language">
      <select
        id="original-language"
        name="originalLanguage"
        {...(onChange ? { value, onChange } : { defaultValue: value })}
      >
        {!Object.hasOwn(locales, value) && <option value={value}>{value}</option>}
        {Object.entries(locales).map(([language, definition]) => (
          <option key={language} value={language}>
            {definition.name}
          </option>
        ))}
      </select>
    </FormField>
  );
}
export { OriginalLanguage };
