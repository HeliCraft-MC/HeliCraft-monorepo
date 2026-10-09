import type { InputHTMLAttributes, ReactElement } from 'react';
import styles from './primitives.module.scss';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}
function TextField({ invalid = false, className, ...props }: TextFieldProps): ReactElement {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={[styles.input, className].filter(Boolean).join(' ')}
    />
  );
}
export { TextField, type TextFieldProps };
