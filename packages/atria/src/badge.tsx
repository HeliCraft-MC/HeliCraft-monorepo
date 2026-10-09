import type { HTMLAttributes, ReactElement } from 'react';
import styles from './primitives.module.scss';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: Tone;
}
function Badge({ tone = 'neutral', className, ...props }: BadgeProps): ReactElement {
  return (
    <span
      {...props}
      data-tone={tone}
      className={[styles.badge, className].filter(Boolean).join(' ')}
    />
  );
}

export { Badge, type BadgeProps };
