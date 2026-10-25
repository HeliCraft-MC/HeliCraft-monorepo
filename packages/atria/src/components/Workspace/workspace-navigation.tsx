import { useCallback, useId, useState } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import styles from './workspace.module.scss';

interface WorkspaceNavigationProps {
  readonly label: string;
  readonly currentLabel: string;
  readonly children: ReactNode;
  readonly className?: string;
}
function WorkspaceNavigation({
  label,
  currentLabel,
  children,
  className,
}: WorkspaceNavigationProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const toggle = useCallback((): void => {
    setOpen((value) => !value);
  }, []);
  const close = useCallback((event: MouseEvent<HTMLElement>): void => {
    if (
      event.target instanceof Element &&
      event.target.closest('a[href], [data-workspace-navigation-item]') !== null
    ) {
      setOpen(false);
    }
  }, []);
  return (
    <div className={[styles.navigation, className].filter(Boolean).join(' ')} data-open={open}>
      <button
        className={styles.navigationToggle}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <Menu size={18} aria-hidden="true" />
        <span>
          <small>{label}</small>
          <strong>{currentLabel}</strong>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <nav id={id} aria-label={label} className={styles.navigationLinks} onClickCapture={close}>
        {children}
      </nav>
    </div>
  );
}
export { WorkspaceNavigation, type WorkspaceNavigationProps };
