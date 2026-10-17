import { Tooltip } from '@base-ui/react/tooltip';
import { useMemo, useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { EntityPreview } from './entity-preview';
import type { EntityPreviewProps } from './entity-preview';
import styles from './player-nickname.module.scss';

interface EntityLinkProps {
  readonly href: string;
  readonly name: string;
  readonly children: ReactNode;
  readonly preview?: EntityPreviewProps;
  readonly onPreview?: () => void;
}
function EntityLink({ href, name, children, preview, onPreview }: EntityLinkProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useMemo(() => <a href={href} aria-label={name} />, [href, name]);
  return preview === undefined ? (
    <a href={href} className={styles.nickname}>
      {children}
    </a>
  ) : (
    <Tooltip.Provider>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          render={anchor}
          aria-describedby={open ? id : undefined}
          className={styles.nickname}
          onPointerEnter={onPreview}
          onFocus={onPreview}
        >
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup id={id} role="tooltip" className={styles.preview}>
              <EntityPreview {...preview} />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
export { EntityLink };
