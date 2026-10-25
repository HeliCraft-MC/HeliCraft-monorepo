import type { ReactElement, ReactNode } from 'react';
import styles from './workspace.module.scss';

interface WorkspaceContentProps {
  readonly children: ReactNode;
  readonly className?: string;
}
function WorkspaceContent({ children, className }: WorkspaceContentProps): ReactElement {
  return <div className={[styles.content, className].filter(Boolean).join(' ')}>{children}</div>;
}
export { WorkspaceContent, type WorkspaceContentProps };
