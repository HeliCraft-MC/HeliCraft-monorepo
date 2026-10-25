import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { WorkspaceThemeContext } from './workspace-theme';
import type { WorkspaceTheme } from './workspace-theme';
import styles from './workspace.module.scss';

interface WorkspaceLayoutProps {
  readonly accent: string;
  readonly children: ReactNode;
  readonly className?: string;
}
function WorkspaceLayout({ accent, children, className }: WorkspaceLayoutProps): ReactElement {
  const theme = useMemo<WorkspaceTheme>(
    () => ({ '--workspace-accent': accent, '--state-accent': accent, '--company-accent': accent }),
    [accent],
  );
  return (
    <WorkspaceThemeContext value={theme}>
      <main
        id="main-content"
        className={[styles.theme, styles.layout, className].filter(Boolean).join(' ')}
        style={theme}
      >
        {children}
      </main>
    </WorkspaceThemeContext>
  );
}
export { WorkspaceLayout, type WorkspaceLayoutProps };
