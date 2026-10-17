import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { LocalizableTextInput } from '@helicraft/atria';
import type { LocalizedInput } from '@helicraft/alhena';
import { locales } from './locales';
import { useTranslation } from './i18n';
import { uiText } from './states/text';

const languages = Object.entries(locales).map(([code, item]) => ({ code, label: item.name }));
function LocalizedInputField({
  label,
  value,
  onChange,
  multiline = false,
}: Readonly<{
  label: string;
  value: LocalizedInput;
  onChange: (value: LocalizedInput) => void;
  multiline?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const change = useCallback(
    (next: Partial<Record<string, string>>): void => {
      onChange(next);
    },
    [onChange],
  );
  return (
    <LocalizableTextInput
      label={label}
      value={value}
      onChange={change}
      languages={languages}
      defaultLanguage={locale}
      multiline={multiline}
      languageLabel={uiText(locale, 'Язык перевода', 'Translation language')}
      progressLabel={uiText(locale, 'Заполнено переводов', 'Translations completed')}
    />
  );
}
export { LocalizedInputField };
