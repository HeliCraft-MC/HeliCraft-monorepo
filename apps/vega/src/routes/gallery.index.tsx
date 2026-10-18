import { translate } from '../locales';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { loadGallery } from '../gallery-data';
import { GalleryPage } from '../gallery-page';
import { metadata } from '../metadata';

const MAX_PAGE = 100_000;
const Route = createFileRoute('/gallery/')({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch supplies a safe search default; it is not a Promise.
  validateSearch: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => await loadGallery({ data: deps }),
  head: ({ loaderData, match }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: translate('seo.gallery.title', match.context.locale),
      description: translate('seo.gallery.description', match.context.locale),
      path: (loaderData?.page ?? 1) > 1 ? `/gallery?page=${loaderData?.page ?? 1}` : '/gallery',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: GalleryPage,
});
export { Route };
