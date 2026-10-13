import { uiText } from './states/text';
import { useMemo, useId, useState, useCallback } from 'react';
import type { ComponentProps, ReactElement, ChangeEvent } from 'react';
import { usePropCache, rowKey } from './states/use-prop-cache';
import { Button, FormField, TextField, Textarea } from '@helicraft/atria';
import type { LocalizedInput } from '@helicraft/alhena';
import { locales } from './locales';
import type { Locale } from './locales';
import { useTranslation } from './i18n';
import styles from './states/states.module.scss';

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
  const id = useId();
  const { locale } = useTranslation();
  const [language, setLanguage] = useState<Locale>(locale);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      onChange({ ...value, [language]: event.currentTarget.value });
    },
    [value, language, onChange],
  );
  const callbackScope1 = useMemo(
    () => [label, value, onChange, multiline, id, locale, language, setLanguage],
    [label, value, onChange, multiline, id, locale, language, setLanguage],
  );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  return (
    <fieldset className={styles.localized}>
      <legend>{label}</legend>
      <fieldset
        className={styles.actions}
        aria-label={uiText(locale, 'Язык перевода', 'Translation language')}
      >
        {Object.entries(locales).map(([code, item]) => (
          <Button
            key={code}
            tone="quiet"
            aria-pressed={language === code}
            onClick={cacheButtonOnClick(rowKey('1329', code, item), () => {
              if (code === 'ru' || code === 'en') {
                setLanguage(code);
              }
            })}
          >
            {item.name} {(value[code === 'ru' ? 'ru' : 'en'] ?? '').trim() === '' ? '—' : '✓'}
          </Button>
        ))}
      </fieldset>
      <FormField htmlFor={id} label={`${label} · ${language.toUpperCase()}`}>
        {multiline ? (
          <Textarea id={id} value={value[language] ?? ''} onChange={change} rows={4} />
        ) : (
          <TextField id={id} value={value[language] ?? ''} onChange={change} />
        )}
      </FormField>
    </fieldset>
  );
}
export { LocalizedInputField };
