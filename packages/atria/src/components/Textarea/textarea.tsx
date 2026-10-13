import type { ReactElement, ComponentPropsWithRef } from 'react';
import styles from '../../primitives.module.scss';

function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>): ReactElement {
  return <textarea {...props} className={[styles.input, className].filter(Boolean).join(' ')} />;
}
export { Textarea };
