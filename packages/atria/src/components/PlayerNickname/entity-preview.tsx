import type { ReactElement } from 'react';
import styles from './player-nickname.module.scss';

interface EntityPreviewProps {
  readonly title: string;
  readonly description?: string;
  readonly facts?: string;
}
function EntityPreview({ title, description, facts }: EntityPreviewProps): ReactElement {
  return (
    <span className={styles.previewContent}>
      <strong>{title}</strong>
      {description !== undefined && <span>{description}</span>}
      {facts !== undefined && <small>{facts}</small>}
    </span>
  );
}
export { EntityPreview, type EntityPreviewProps };
