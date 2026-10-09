import type { ReactElement, ReactNode } from 'react';
import styles from './primitives.module.scss';

interface AlertProps {
  readonly children: ReactNode;
  readonly tone?: 'info' | 'danger' | 'success';
}
function Alert({ children, tone = 'info' }: AlertProps): ReactElement {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={styles.alert} data-tone={tone}>
      {children}
    </div>
  );
}
export { Alert, type AlertProps };
