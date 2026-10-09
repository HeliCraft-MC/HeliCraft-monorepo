import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import type { GetSessionsResponse } from '@helicraft/alhena';
import { formatDate } from './date-format';
import styles from './account.module.scss';

interface SessionRowProps {
  readonly session: GetSessionsResponse[number];
  readonly onRevoke: (id: string, current: boolean) => Promise<void>;
}
function SessionRow({ session, onRevoke }: SessionRowProps): ReactElement {
  const { id, current } = session;
  const handleRevoke = useCallback((): void => {
    void onRevoke(id, current);
  }, [onRevoke, id, current]);
  return (
    <p className={styles.paragraph}>
      {session.current ? 'Это устройство' : (session.userAgent ?? 'Другое устройство')} ·{' '}
      {formatDate(session.lastSeenAt)}{' '}
      <Button tone="quiet" onClick={handleRevoke}>
        Завершить
      </Button>
    </p>
  );
}
export { SessionRow };
