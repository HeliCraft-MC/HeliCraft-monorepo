import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from '../companies/companies.module.scss';

const EMPTY_SEARCH: Readonly<Record<string, string>> = {};
function FxPagination({
  path,
  page,
  hasMore,
  search = EMPTY_SEARCH,
}: Readonly<{
  path: string;
  page: number;
  hasMore: boolean;
  search?: Readonly<Record<string, string>>;
}>): ReactElement | null {
  const { locale } = useTranslation();
  if (page === 1 && !hasMore) {
    return null;
  }
  return (
    <nav
      className={styles.actions}
      aria-label={uiText(locale, 'Страницы обмена', 'Exchange pages')}
    >
      {page > 1 && (
        <a
          href={`${path}?${new URLSearchParams({ ...search, page: String(page - 1), lang: locale }).toString()}`}
        >
          {uiText(locale, 'Назад', 'Previous')}
        </a>
      )}
      <span>
        {uiText(locale, 'Страница', 'Page')} {page}
      </span>
      {hasMore && (
        <a
          href={`${path}?${new URLSearchParams({ ...search, page: String(page + 1), lang: locale }).toString()}`}
        >
          {uiText(locale, 'Далее', 'Next')}
        </a>
      )}
    </nav>
  );
}
export { FxPagination };
