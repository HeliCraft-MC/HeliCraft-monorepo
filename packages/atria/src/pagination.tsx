import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button } from './button';
import styles from './primitives.module.scss';

interface PaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}
function Pagination({ page, pageSize, total, onPageChange }: PaginationProps): ReactElement {
  const handlePrevious = useCallback((): void => {
    onPageChange(page - 1);
  }, [onPageChange, page]);
  const handleNext = useCallback((): void => {
    onPageChange(page + 1);
  }, [onPageChange, page]);
  return (
    <nav aria-label="Страницы списка" className={styles.pagination}>
      <Button tone="quiet" disabled={page <= 1} onClick={handlePrevious}>
        Назад
      </Button>
      <span>
        Страница {page} из {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <Button tone="quiet" disabled={page * pageSize >= total} onClick={handleNext}>
        Далее
      </Button>
    </nav>
  );
}
export { Pagination, type PaginationProps };
