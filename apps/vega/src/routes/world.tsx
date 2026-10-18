import { translate } from '../locales';
import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '../info-page';
import { loadPublicHome } from '../public-data';
import { metadata } from '../metadata';

export const Route = createFileRoute('/world')({
  loader: async () => await loadPublicHome(),
  head: ({ loaderData, match }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: translate('world.title', match.context.locale),
      description: translate('seo.world.description', match.context.locale),
      path: '/world',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: InfoPage,
});
