import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { InputLanguage } from '../LocalizableTextInput/localizable-text-input';
import { Select } from '../Select/select';
import styles from './form.module.scss';

interface FormLanguageSwitchProps {
  readonly languages: readonly InputLanguage[];
  readonly value: string;
  readonly label: string;
  readonly hint: string;
  readonly onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}
function FormLanguageSwitch({
  languages,
  value,
  label,
  hint,
  onChange,
}: FormLanguageSwitchProps): ReactElement {
  const id = useId();
  return (
    <div className={styles.languageBar}>
      <label htmlFor={id}>{label}</label>
      <Select id={id} value={value} onChange={onChange} aria-describedby={`${id}-hint`}>
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </Select>
      <p id={`${id}-hint`}>{hint}</p>
    </div>
  );
}
export { FormLanguageSwitch };
