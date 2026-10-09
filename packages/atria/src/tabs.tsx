import { Tabs as Primitive } from '@base-ui/react/tabs';
import type { ReactElement, ReactNode } from 'react';
import styles from './overlays.module.scss';

interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}
function Tabs({
  items,
  defaultValue,
}: Readonly<{ items: readonly TabItem[]; defaultValue?: string }>): ReactElement {
  return (
    <Primitive.Root defaultValue={defaultValue ?? items[0]?.id}>
      <Primitive.List className={styles.tabList}>
        {items.map((item) => (
          <Primitive.Tab
            key={item.id}
            value={item.id}
            disabled={item.disabled}
            className={styles.tab}
          >
            {item.label}
          </Primitive.Tab>
        ))}
      </Primitive.List>
      {items.map((item) => (
        <Primitive.Panel key={item.id} value={item.id} className={styles.tabPanel}>
          {item.content}
        </Primitive.Panel>
      ))}
    </Primitive.Root>
  );
}
export { Tabs, type TabItem };
