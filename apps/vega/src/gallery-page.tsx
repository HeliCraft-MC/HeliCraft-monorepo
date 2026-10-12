import { Icon, ActionLink } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { GalleryGrid } from './gallery-grid';
import styles from './gallery.module.scss';

const route = getRouteApi('/gallery/');
const PAGE_SIZE = 18;
const SECOND_PAGE = 2;
function GalleryPage(): ReactElement {
  const { text } = useTranslation();

  const { gallery, page } = route.useLoaderData();
  const totalPages = Math.ceil((gallery?.total ?? 0) / PAGE_SIZE);
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>{text('gallery.title')}</h1>
          <p>
            {text('gallery.description')}
            <br />
            {text('gallery.shareHint')}
          </p>
        </div>
        <ActionLink href="/app/gallery/new">
          {text('gallery.upload.title')} <Icon name="arrowUpRight" />
        </ActionLink>
      </div>
      <GalleryGrid gallery={gallery} page={page} />
      <nav className={styles.pagination} aria-label={text('gallery.paginationLabel')}>
        {page > 1 && (
          <a href={page === SECOND_PAGE ? '/gallery' : `/gallery?page=${page - 1}`}>
            <Icon name="arrowLeft" /> {text('common.previous')}
          </a>
        )}
        {totalPages > 0 && (
          <span>
            {text('common.page')} {page} {text('common.of')} {totalPages}
          </span>
        )}
        {page < totalPages && (
          <a href={`/gallery?page=${page + 1}`}>
            {text('common.next')} <Icon name="arrowRight" />
          </a>
        )}
      </nav>
    </main>
  );
}
export { GalleryPage };
