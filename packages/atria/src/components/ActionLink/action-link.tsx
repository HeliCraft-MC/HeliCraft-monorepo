import type { AnchorHTMLAttributes, ReactElement } from 'react';
import styles from './action-link.module.scss';

interface ActionLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly tone?: 'primary' | 'quiet';
}
function ActionLink({
  tone = 'primary',
  className,
  children,
  ...props
}: ActionLinkProps): ReactElement {
  return (
    <a
      {...props}
      className={[styles.link, tone === 'primary' ? styles.primary : styles.quiet, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </a>
  );
}
export { ActionLink, type ActionLinkProps };
