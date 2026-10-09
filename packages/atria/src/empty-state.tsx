import type { ReactElement, ReactNode } from 'react';
import styles from './primitives.module.scss';

interface EmptyStateProps {
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
}
function EmptyState({ title, children, action }: EmptyStateProps): ReactElement {
  return (
    <section className={styles.empty}>
      <h2>{title}</h2>
      {children === undefined ? null : <p>{children}</p>}
      {action}
    </section>
  );
}

export { EmptyState, type EmptyStateProps };
