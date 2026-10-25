import type { ReactElement, ReactNode } from 'react';
import styles from './workspace.module.scss';

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}
function PageHeader({ title, description, actions }: PageHeaderProps): ReactElement {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>{title}</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      {actions !== undefined && <div className={styles.headerActions}>{actions}</div>}
    </header>
  );
}
export { PageHeader, type PageHeaderProps };
