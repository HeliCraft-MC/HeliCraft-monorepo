import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

function LimitField({
  field,
  title,
  help,
}: Readonly<{ field: string; title: string; help: string }>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const [mode, setMode] = useState('');
  const change = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setMode(event.currentTarget.value);
  }, []);
  return (
    <div className={styles.form}>
      <FormField label={title} htmlFor={id} help={help}>
        <Select id={id} name={`${field}Mode`} required value={mode} onChange={change}>
          <option value="">{text('monetary.choose')}</option>
          <option value="LIMITED">{text('monetary.limited')}</option>
          <option value="UNLIMITED">{text('monetary.unlimited')}</option>
        </Select>
      </FormField>
      {mode === 'LIMITED' && (
        <FormField label={`${text('monetary.limit')}: ${title}`} htmlFor={`${id}-amount`}>
          <TextField
            id={`${id}-amount`}
            name={field}
            inputMode="decimal"
            required
            maxLength={31}
            placeholder="0.00"
          />
        </FormField>
      )}
    </div>
  );
}
export { LimitField };
