import type { HTMLAttributes, ReactElement } from 'react';
import styles from './primitives.module.scss';

interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly as?: 'article' | 'section';
}
function Card({ as: Tag = 'section', className, ...props }: CardProps): ReactElement {
  return <Tag {...props} className={[styles.card, className].filter(Boolean).join(' ')} />;
}

export { Card, type CardProps };
