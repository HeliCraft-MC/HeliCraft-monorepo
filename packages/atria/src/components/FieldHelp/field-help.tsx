import { Popover } from '@base-ui/react/popover';
import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { CircleHelp } from 'lucide-react';
import styles from './field-help.module.scss';

interface FieldHelpProps {
  readonly label: string;
  readonly content: string;
  readonly showLabel?: boolean;
}
function FieldHelp({ label, content, showLabel = false }: FieldHelpProps): ReactElement | null {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const changeOpen = useCallback(
    (next: boolean, details: Popover.Root.ChangeEventDetails): void => {
      if (details.reason === 'trigger-press') {
        pinned.current = !pinned.current;
        setOpen(pinned.current);
        return;
      }
      if (
        pinned.current &&
        (details.reason === 'trigger-hover' || details.reason === 'focus-out')
      ) {
        return;
      }
      if (!next) {
        pinned.current = false;
      }
      setOpen(next);
    },
    [],
  );
  if (content.trim() === '' || content.trim() === label.trim()) {
    return null;
  }
  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        openOnHover
        delay={0}
        closeDelay={0}
        className={[styles.trigger, showLabel ? styles.labelled : ''].filter(Boolean).join(' ')}
        aria-label={`ⓘ ${label}`}
      >
        <CircleHelp size={16} aria-hidden="true" />
        {showLabel && <span>{label}</span>}
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
