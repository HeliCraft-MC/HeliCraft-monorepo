import { localizeGallery } from '../localized-content';
import { translate } from '../locales';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { loadGalleryDetail } from '../gallery-data';
import { GalleryDetail } from '../gallery-detail';
import { HTTP } from '../http-status';
import { metadata } from '../metadata';

const Route = createFileRoute('/gallery/$id')({
  loader: async ({ params }) => {
    const data = await loadGalleryDetail({ data: { id: params.id } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.item) {
      throw new Error('gallery.photoUnavailable');
    }
    return data;
  },
  head: ({ loaderData, match }) => {
    const item = loaderData?.item
      ? localizeGallery(loaderData.item, match.context.locale)
      : undefined;
    return metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: item?.title ?? translate('seo.photo.title', match.context.locale),
      description:
        item?.description ?? item?.alt ?? translate('seo.photo.description', match.context.locale),
      path: `/gallery/${item?.id ?? ''}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    });
  },
  component: GalleryDetail,
});
export { Route };
