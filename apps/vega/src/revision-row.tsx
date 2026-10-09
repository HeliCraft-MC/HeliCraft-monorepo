import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import type { Revision } from './editor-api';
import { formatDate } from './date-format';
import styles from './account.module.scss';

function RevisionRow({
  revision,
  busy,
  restore,
}: Readonly<{
  revision: Revision;
  busy: boolean;
  restore: (revision: number) => void;
}>): ReactElement {
  const select = useCallback((): void => {
    restore(revision.revision);
  }, [restore, revision.revision]);
  return (
    <p className={styles.paragraph}>
      #{revision.revision} · {formatDate(revision.createdAt)}{' '}
      <Button tone="quiet" disabled={busy} onClick={select}>
        Восстановить
      </Button>
    </p>
  );
}

export { RevisionRow };
