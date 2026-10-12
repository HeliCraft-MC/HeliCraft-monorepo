import { localizeGallery } from './localized-content';
import { useTranslation } from './i18n';
import type { ReactElement } from 'react';
import type { GalleryItem } from '@helicraft/alhena';
import { Alert, EmptyState, GalleryTile } from '@helicraft/atria';
import styles from './gallery.module.scss';

function GalleryGrid({
  gallery,
  page,
}: Readonly<{
  gallery: { items: readonly GalleryItem[]; total: number } | null;
  page: number;
}>): ReactElement {
  const { text, locale } = useTranslation();

  if (gallery === null) {
    return <Alert tone="info">{text('gallery.unavailable')}</Alert>;
  }
  if (gallery.items.length === 0) {
    return (
      <EmptyState title={text('gallery.empty')}>
        {page > 1 ? text('gallery.emptyPage') : text('gallery.emptyHint')}
      </EmptyState>
    );
  }
  return (
    <div className={styles.grid}>
      {gallery.items
        .map((record) => localizeGallery(record, locale))
        .map((item) => (
          <GalleryTile
            key={item.id}
            href={`/gallery/${item.id}`}
            image={item.thumbnailUrl}
            alt={item.alt}
            title={item.title}
            author={item.author.name}
            date={item.createdAt}
            width={item.width}
            height={item.height}
          />
        ))}
    </div>
  );
}
export { GalleryGrid };
