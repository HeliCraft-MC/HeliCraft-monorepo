import type { InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import styles from '../../primitives.module.scss';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: ReactNode;
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
