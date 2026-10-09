import type { ReactElement, ReactNode } from 'react';
import styles from './primitives.module.scss';

interface FormFieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactNode;
}
function FormField({ label, htmlFor, hint, error, children }: FormFieldProps): ReactElement {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint !== undefined && hint.length > 0 ? (
        <p id={`${htmlFor}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error !== undefined && error.length > 0 ? (
        <p id={`${htmlFor}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
export { FormField, type FormFieldProps };
