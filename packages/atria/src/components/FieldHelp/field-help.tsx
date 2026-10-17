import { Popover } from '@base-ui/react/popover';
import type { ReactElement } from 'react';
import styles from './field-help.module.scss';

interface FieldHelpProps {
  readonly label: string;
  readonly content: string;
}
function FieldHelp({ label, content }: FieldHelpProps): ReactElement {
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover className={styles.trigger} aria-label={`ⓘ ${label}`}>
        <span aria-hidden="true">ⓘ</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className={styles.popup}>
            <Popover.Title className={styles.title}>{label}</Popover.Title>
            <Popover.Description>{content}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
export { FieldHelp, type FieldHelpProps };
