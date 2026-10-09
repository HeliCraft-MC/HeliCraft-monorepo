import { Tooltip as Primitive } from '@base-ui/react/tooltip';
import type { ReactElement, ReactNode } from 'react';
import styles from './overlays.module.scss';

interface TooltipProps {
  readonly children: ReactNode;
  readonly content: string;
}
function Tooltip({ children, content }: TooltipProps): ReactElement {
  return (
    <Primitive.Provider>
      <Primitive.Root>
        <Primitive.Trigger className={styles.tooltipTrigger}>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Positioner>
            <Primitive.Popup className={styles.tooltip}>{content}</Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
export { Tooltip, type TooltipProps };
