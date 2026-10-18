import { translate } from '../locales';
import type { ReactElement } from 'react';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { Home as HomeView } from '../home';
import { loadPublicHome } from '../public-data';
import { metadata } from '../metadata';

const homeRoute = getRouteApi('/');
function Home(): ReactElement {
  return <HomeView data={homeRoute.useLoaderData()} />;
}
const Route = createFileRoute('/')({
  loader: async () => await loadPublicHome(),
  head: ({ loaderData, match }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: translate('seo.home.title', match.context.locale),
      description: translate('seo.home.description', match.context.locale),
      path: '/',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Home,
});

export { Route };
