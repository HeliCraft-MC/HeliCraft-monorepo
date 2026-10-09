import type { InputHTMLAttributes, ReactElement } from 'react';
import styles from './primitives.module.scss';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: string;
}
function Checkbox({ label, ...props }: CheckboxProps): ReactElement {
  return (
    <label className={styles.checkbox}>
      <input {...props} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
export { Checkbox, type CheckboxProps };
