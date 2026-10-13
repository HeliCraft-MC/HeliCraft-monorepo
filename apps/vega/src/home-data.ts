import { localizeGallery } from './localized-content';
import type { CarouselPhoto } from '@helicraft/atria';
import type { GalleryItem } from '@helicraft/alhena';
import type { loadPublicHome } from './public-data';

type HomeData = Awaited<ReturnType<typeof loadPublicHome>>;
const archivePhotos: readonly CarouselPhoto[] = ['skyline', 'town', 'night', 'castle'].map(
  (name) => ({
    src: `/world/${name}.webp`,
    small: `/world/${name}-small.webp`,
    title: 'home.archive.photoTitle',
    alt: 'home.archive.photoAlt',
    place: 'home.archive.source',
  }),
);
function homePhotos(
  gallery: { total: number; items: readonly GalleryItem[] } | null,
  language = 'ru',
): readonly CarouselPhoto[] {
  const MIN_PUBLIC_COUNT = 5;
  return gallery && gallery.total > MIN_PUBLIC_COUNT && gallery.items.length > 0
    ? gallery.items
        .map((record) => localizeGallery(record, language))
        .map((item) => ({
          src: item.imageUrl,
          small: item.thumbnailUrl,
          title: item.title,
          alt: item.alt,
          author: item.author.name,
          authorHref: `/players/${item.author.id}`,
          authorHeadUrl: `/api/v1/public/players/${item.author.id}/avatar.png`,
          place: item.place === '' ? item.description : item.place,
          href: `/gallery/${item.id}`,
        }))
    : archivePhotos;
}
export { type HomeData, archivePhotos, homePhotos };
