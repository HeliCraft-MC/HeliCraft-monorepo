import type { ReactElement, ReactNode } from 'react';
import styles from './primitives.module.scss';

interface PageContainerProps {
  readonly children: ReactNode;
  readonly narrow?: boolean;
}
function PageContainer({ children, narrow = false }: PageContainerProps): ReactElement {
  return <div className={narrow ? styles.narrow : styles.container}>{children}</div>;
}
export { PageContainer, type PageContainerProps };
