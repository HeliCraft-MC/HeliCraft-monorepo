import { Dialog as Primitive } from '@base-ui/react/dialog';
import type { ReactElement, ReactNode } from 'react';
import { useWorkspaceTheme } from '../Workspace/workspace-theme';
import { X } from 'lucide-react';
import styles from '../../overlays.module.scss';
import themeStyles from '../Workspace/workspace.module.scss';

interface DialogProps {
  readonly trigger?: ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly closeLabel?: string;
  readonly size?: 'default' | 'fullscreen';
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}
function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  closeLabel = 'Закрыть',
  size = 'default',
}: DialogProps): ReactElement {
  const theme = useWorkspaceTheme();
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger === undefined ? null : (
        <Primitive.Trigger className={styles.trigger}>{trigger}</Primitive.Trigger>
      )}
      <Primitive.Portal>
        <Primitive.Backdrop className={styles.backdrop} />
        <Primitive.Popup
          style={theme}
          className={`${styles.dialog} ${size === 'fullscreen' ? styles.dialogFullscreen : ''} ${theme === undefined ? '' : themeStyles.theme}`}
        >
          <header className={styles.dialogHeader}>
            <Primitive.Title>{title}</Primitive.Title>
            <Primitive.Close className={styles.dialogClose} aria-label={closeLabel}>
              <X size={20} aria-hidden="true" />
            </Primitive.Close>
          </header>
          {description === undefined ? null : (
            <Primitive.Description>{description}</Primitive.Description>
          )}
          {children}
        </Primitive.Popup>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export { Dialog, type DialogProps };
