import { Dialog as Primitive } from '@base-ui/react/dialog';
import type { ReactElement, ReactNode } from 'react';
import styles from './overlays.module.scss';

interface DialogProps {
  readonly trigger: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}
function Dialog({ trigger, title, description, children }: DialogProps): ReactElement {
  return (
    <Primitive.Root>
      <Primitive.Trigger className={styles.trigger}>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Backdrop className={styles.backdrop} />
        <Primitive.Popup className={styles.dialog}>
          <Primitive.Title>{title}</Primitive.Title>
          {description === undefined ? null : (
            <Primitive.Description>{description}</Primitive.Description>
          )}
          {children}
          <Primitive.Close className={styles.trigger}>Закрыть</Primitive.Close>
        </Primitive.Popup>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export { Dialog, type DialogProps };
