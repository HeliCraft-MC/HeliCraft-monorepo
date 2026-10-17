import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Select } from '../Select/select';
import { TextField } from '../TextField/text-field';
import { Textarea } from '../Textarea/textarea';
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
// oxlint-disable-next-line max-lines-per-function -- The controlled multilingual field keeps accessible language selection and input composition together.
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
  const [selected, setSelected] = useState(defaultLanguage);
  const language = languages.find((item) => item.code === selected) ?? languages[0];
  const selectLanguage = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (language !== undefined) {
        onChange({ ...value, [language.code]: event.currentTarget.value });
      }
    },
    [language, value, onChange],
  );
  const translated = languages.filter((item) => (value[item.code] ?? '').trim() !== '').length;
  return (
    <fieldset className={styles.field}>
      <legend>{label}</legend>
      <div className={styles.toolbar}>
        <label htmlFor={`${id}-language`}>{languageLabel}</label>
        <Select id={`${id}-language`} value={language?.code ?? ''} onChange={selectLanguage}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
              {(value[item.code] ?? '').trim() === '' ? '' : ' ✓'}
            </option>
          ))}
        </Select>
        <small
          id={`${id}-progress`}
          aria-label={`${progressLabel}: ${translated}/${languages.length}`}
          title={progressLabel}
        >
          ✓ {translated}/{languages.length}
        </small>
      </div>
      <label className={styles.inputLabel} htmlFor={id}>
        {label} · {language?.label}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          value={value[language?.code ?? ''] ?? ''}
          onChange={change}
          rows={4}
          aria-describedby={`${id}-progress`}
        />
      ) : (
        <TextField
          id={id}
          value={value[language?.code ?? ''] ?? ''}
          onChange={change}
          aria-describedby={`${id}-progress`}
        />
      )}
    </fieldset>
  );
}
export { LocalizableTextInput, type LocalizableTextInputProps, type InputLanguage };
