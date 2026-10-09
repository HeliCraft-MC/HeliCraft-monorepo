import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { TextField } from './text-field';
import type { TextFieldProps } from './text-field';
import styles from './primitives.module.scss';

function PasswordField(props: Omit<TextFieldProps, 'type'>): ReactElement {
  const [visible, setVisible] = useState(false);
  const handleToggle = useCallback((): void => {
    setVisible((value) => !value);
  }, []);
  return (
    <div className={styles.password}>
      <TextField {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        onClick={handleToggle}
      >
        {visible ? 'Скрыть' : 'Показать'}
      </button>
    </div>
  );
}
export { PasswordField };
