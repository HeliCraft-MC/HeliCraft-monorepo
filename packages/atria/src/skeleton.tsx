import type { HTMLAttributes, ReactElement } from 'react';
import styles from './primitives.module.scss';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
    />
  );
}

export { Skeleton };
