import { Toast as Primitive } from '@base-ui/react/toast';
import type { ReactElement } from 'react';
import { useToast } from './toast-manager';
import styles from './overlays.module.scss';

function ToastViewport(): ReactElement {
  const { toasts } = useToast();
  return (
    <Primitive.Portal>
      <Primitive.Viewport className={styles.toastViewport}>
        {toasts.map((toast) => (
          <Primitive.Root key={toast.id} toast={toast} className={styles.toast}>
            <Primitive.Content>
              <Primitive.Title />
              <Primitive.Description />
            </Primitive.Content>
            <Primitive.Close className={styles.trigger} aria-label="Закрыть уведомление">
              ×
            </Primitive.Close>
          </Primitive.Root>
        ))}
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}

export { ToastViewport };
