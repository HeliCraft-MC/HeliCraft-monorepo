import type { ReactElement, TextareaHTMLAttributes } from 'react';
import styles from './primitives.module.scss';

function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactElement {
  return <textarea {...props} className={[styles.input, className].filter(Boolean).join(' ')} />;
}
export { Textarea };
