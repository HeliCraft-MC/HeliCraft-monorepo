import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import type { ProfileSearch } from './profile-search';
import styles from './companies.module.scss';

function ProfilePagination({
  id,
  search,
  field,
  hasMore,
}: Readonly<{
  id: string;
  search: ProfileSearch;
  field: keyof ProfileSearch;
  hasMore: boolean;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const page = search[field];
  if (page === 1 && !hasMore) {
    return null;
  }
  function href(next: number): string {
    const values = Object.fromEntries(
      Object.entries({ ...search, [field]: next }).map(([key, value]) => [key, String(value)]),
    );
    return `/companies/${id}?${new URLSearchParams({ ...values, lang: locale }).toString()}`;
  }
  return (
    <nav
      className={styles.actions}
      aria-label={uiText(locale, 'Страницы раздела', 'Section pages')}
    >
      {page > 1 && <a href={href(page - 1)}>{uiText(locale, 'Назад', 'Previous')}</a>}
      <span>
        {uiText(locale, 'Страница', 'Page')} {page}
      </span>
      {hasMore && <a href={href(page + 1)}>{uiText(locale, 'Далее', 'Next')}</a>}
    </nav>
  );
}
export { ProfilePagination };
