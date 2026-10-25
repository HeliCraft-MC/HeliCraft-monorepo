import { useCallback, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import styles from './workspace.module.scss';

interface ActionPanelProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
}
function ActionPanel({
  title,
  description,
  children,
  defaultOpen = false,
}: ActionPanelProps): ReactElement {
  const element = useRef<HTMLDetailsElement>(null);
  const reveal = useCallback((): void => {
    if (element.current !== null) {
      element.current.open = true;
    }
  }, []);
  return (
    <details
      ref={element}
      className={styles.actionPanel}
      open={defaultOpen}
      onInvalidCapture={reveal}
    >
      <summary>
        <Plus size={18} aria-hidden="true" />
        <span>
          <strong>{title}</strong>
          {description !== undefined && <small>{description}</small>}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className={styles.actionContent}>{children}</div>
    </details>
  );
}
export { ActionPanel, type ActionPanelProps };
