import { Dialog as Primitive } from '@base-ui/react/dialog';
import type { ReactElement, ReactNode } from 'react';
import styles from '../../overlays.module.scss';

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
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger === undefined ? null : (
        <Primitive.Trigger className={styles.trigger}>{trigger}</Primitive.Trigger>
      )}
      <Primitive.Portal>
        <Primitive.Backdrop className={styles.backdrop} />
        <Primitive.Popup
          className={`${styles.dialog} ${size === 'fullscreen' ? styles.dialogFullscreen : ''}`}
        >
          <Primitive.Title>{title}</Primitive.Title>
          {description === undefined ? null : (
            <Primitive.Description>{description}</Primitive.Description>
          )}
          {children}
          <Primitive.Close className={styles.trigger}>{closeLabel}</Primitive.Close>
        </Primitive.Popup>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export { Dialog, type DialogProps };
