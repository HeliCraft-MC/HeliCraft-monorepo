import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useLocation } from '@tanstack/react-router';
import { CitizenGroup } from './citizen-group';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

const PAGE_SIZE = 10;
function citizenHref(search: string, page: number): string {
  const query = new URLSearchParams(search);
  query.set('citizenPage', String(page));
  return `?${query.toString()}#state-citizens`;
}
function StateCitizens({
  citizens,
}: Readonly<{ citizens: StateDetail['citizens'] }>): ReactElement {
  const { locale } = useTranslation();
  const search = useLocation({ select: (location) => location.searchStr });
  const requested = Number(new URLSearchParams(search).get('citizenPage'));
  const pages = Math.max(1, Math.ceil(citizens.length / PAGE_SIZE));
  const page = Number.isInteger(requested) ? Math.max(1, Math.min(pages, requested)) : 1;
  return (
    <>
      <CitizenGroup citizens={citizens.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} />
      {pages > 1 && (
        <nav
          className={styles.pagination}
          aria-label={uiText(locale, 'Страницы граждан', 'Citizen pages')}
        >
          {page > 1 && (
            <a href={citizenHref(search, page - 1)}>{uiText(locale, 'Назад', 'Previous')}</a>
          )}
          <span>
            {uiText(locale, 'Страница', 'Page')} {page}/{pages}
          </span>
          {page < pages && (
            <a href={citizenHref(search, page + 1)}>{uiText(locale, 'Далее', 'Next')}</a>
          )}
        </nav>
      )}
    </>
  );
}
export { StateCitizens };
