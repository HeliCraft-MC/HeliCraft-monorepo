import type { ReactElement, SelectHTMLAttributes } from 'react';
import styles from './primitives.module.scss';

function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): ReactElement {
  return <select {...props} className={[styles.input, className].filter(Boolean).join(' ')} />;
}
export { Select };
