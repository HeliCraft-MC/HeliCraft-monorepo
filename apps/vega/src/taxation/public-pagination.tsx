import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

function PublicHistoryPagination({
  path,
  page,
  hasMore,
}: Readonly<{ path: string; page: number; hasMore: boolean }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <nav
      className={styles.actions}
      aria-label={uiText(locale, 'Страницы истории', 'History pages')}
    >
      {page > 1 && (
        <a href={`${path}?page=${page - 1}&lang=${locale}`}>
          {uiText(locale, 'Назад', 'Previous')}
        </a>
      )}
      <span>
        {uiText(locale, 'Страница', 'Page')} {page}
      </span>
      {hasMore && (
        <a href={`${path}?page=${page + 1}&lang=${locale}`}>{uiText(locale, 'Далее', 'Next')}</a>
      )}
    </nav>
  );
}
export { PublicHistoryPagination };
