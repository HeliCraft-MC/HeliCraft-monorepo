import { createContext, useContext } from 'react';
import type { CSSProperties } from 'react';

type WorkspaceTheme = CSSProperties & {
  readonly '--workspace-accent': string;
  readonly '--state-accent': string;
  readonly '--company-accent': string;
};
const WorkspaceThemeContext = createContext<WorkspaceTheme | undefined>(undefined);
function useWorkspaceTheme(): WorkspaceTheme | undefined {
  return useContext(WorkspaceThemeContext);
}
export { WorkspaceThemeContext, useWorkspaceTheme, type WorkspaceTheme };
