import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

function MonetaryPagination({
  page,
  hasMore,
  onPage,
}: Readonly<{
  page: number;
  hasMore: boolean;
  onPage: (page: number) => void;
}>): ReactElement | null {
  const { text } = useTranslation();
  const previous = useCallback((): void => {
    onPage(page - 1);
  }, [page, onPage]);
  const next = useCallback((): void => {
    onPage(page + 1);
  }, [page, onPage]);
  if (page === 1 && !hasMore) {
    return null;
  }
  return (
    <nav className={styles.actions} aria-label={text('monetary.history')}>
      <Button tone="quiet" disabled={page === 1} onClick={previous}>
        {text('common.previous')}
      </Button>
      <span>{page}</span>
      <Button tone="quiet" disabled={!hasMore} onClick={next}>
        {text('common.next')}
      </Button>
    </nav>
  );
}
export { MonetaryPagination };
