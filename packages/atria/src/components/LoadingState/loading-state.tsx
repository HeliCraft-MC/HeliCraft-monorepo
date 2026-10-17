import type { ReactElement } from 'react';
import styles from './loading-state.module.scss';

interface LoadingStateProps {
  readonly label: string;
  readonly compact?: boolean;
}

// Reserve space while content loads; the label stays visible with reduced motion.
function LoadingState({ label, compact = false }: LoadingStateProps): ReactElement {
  return (
    <output className={`${styles.loading} ${compact ? styles.compact : ''}`} aria-live="polite">
      <span className={styles.ring} aria-hidden="true" />
      <span>{label}</span>
    </output>
  );
}
export { LoadingState, type LoadingStateProps };
