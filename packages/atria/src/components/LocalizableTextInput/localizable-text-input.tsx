import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { TextField } from '../TextField/text-field';
import { Textarea } from '../Textarea/textarea';
import { useFormTranslation } from '../Form/form-context';
import styles from './localizable-text-input.module.scss';

interface InputLanguage {
  readonly code: string;
  readonly label: string;
}
interface LocalizableTextInputProps {
  readonly label: string;
  readonly value: Readonly<Partial<Record<string, string>>>;
  readonly onChange: (value: Partial<Record<string, string>>) => void;
  readonly languages: readonly InputLanguage[];
  readonly defaultLanguage: string;
  readonly languageLabel: string;
  readonly progressLabel: string;
  readonly multiline?: boolean;
}
// oxlint-disable-next-line max-lines-per-function -- Standalone and form-wide translation modes share accessible field rendering without duplicating values.
function LocalizableTextInput({
  label,
  value,
  onChange,
  languages,
  defaultLanguage,
  languageLabel,
  progressLabel,
  multiline = false,
}: LocalizableTextInputProps): ReactElement {
  const id = useId();
  const shared = useFormTranslation();
  const primary =
    languages.find((item) => item.code === (shared?.language ?? defaultLanguage)) ?? languages[0];
  const translations = languages.filter((item) => item.code !== primary?.code);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const code = event.currentTarget.dataset.language;
      if (code !== undefined) {
        onChange({ ...value, [code]: event.currentTarget.value });
      }
    },
    [value, onChange],
  );
  const ordered = primary === undefined ? [] : [primary, ...translations];
  const fields = ordered.map((language) => (
    <div key={language.code} className={styles.translation}>
      <label
        htmlFor={`${id}-${language.code}`}
        className={shared === null ? '' : styles.inputLabel}
      >
        <span>{language.label}</span>
        <span className={styles.inputLabel}>
          {label} · {language.label}
        </span>
      </label>
      {multiline ? (
        <Textarea
          id={`${id}-${language.code}`}
          aria-label={`${label} · ${language.label}`}
          lang={language.code}
          data-language={language.code}
          value={value[language.code] ?? ''}
          onChange={change}
          rows={3}
        />
      ) : (
        <TextField
          id={`${id}-${language.code}`}
          aria-label={`${label} · ${language.label}`}
          lang={language.code}
          data-language={language.code}
          value={value[language.code] ?? ''}
          onChange={change}
        />
      )}
    </div>
  ));
  const translated = languages.filter((item) => (value[item.code] ?? '').trim() !== '').length;
  return (
    <fieldset className={styles.field}>
      <legend>{label}</legend>
      {fields[0]}
      {shared === null && translations.length > 0 && (
        <details className={styles.translations}>
          <summary>
            <span>{languageLabel}</span>
            <small aria-label={`${progressLabel}: ${translated}/${languages.length}`}>
              {translated}/{languages.length}
            </small>
          </summary>
          <div className={styles.translationGrid}>{fields.slice(1)}</div>
        </details>
      )}
    </fieldset>
  );
}
export { LocalizableTextInput, type LocalizableTextInputProps, type InputLanguage };
