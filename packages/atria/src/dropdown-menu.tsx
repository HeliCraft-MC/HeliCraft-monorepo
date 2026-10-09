import { Menu as Primitive } from '@base-ui/react/menu';
import type { ReactElement, ReactNode } from 'react';
import styles from './overlays.module.scss';

interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly handleSelect: () => void;
}
function DropdownMenu({
  trigger,
  items,
}: Readonly<{ trigger: ReactNode; items: readonly MenuItem[] }>): ReactElement {
  return (
    <Primitive.Root>
      <Primitive.Trigger className={styles.trigger}>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Positioner>
          <Primitive.Popup className={styles.menu}>
            {items.map((item) => (
              <Primitive.Item
                key={item.id}
                disabled={item.disabled}
                onClick={item.handleSelect}
                className={styles.menuItem}
              >
                {item.label}
              </Primitive.Item>
            ))}
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export { DropdownMenu, type MenuItem };
