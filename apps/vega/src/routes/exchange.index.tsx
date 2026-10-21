import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PublicFxOffers } from '../fx/public-pages';
import { fxSearch, loadFxOffers } from '../fx/public-data';
import { metadata } from '../metadata';
import { uiText } from '../states/text';

const route = getRouteApi('/exchange/');
function Page(): ReactElement {
  return <PublicFxOffers offers={route.useLoaderData().offers} search={route.useSearch()} />;
}
const Route = createFileRoute('/exchange/')({
  validateSearch: fxSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => await loadFxOffers({ data: deps }),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site.serverName,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Обмен валют', 'Currency exchange'),
      description: uiText(
        match.context.locale,
        'Обеспеченные валютные предложения Центральных банков {serverName}.',
        'Reserved central bank currency offers in {serverName}.',
      ),
      path: '/exchange',
      noindex:
        loaderData?.offers === null ||
        match.search.page > 1 ||
        match.search.search !== '' ||
        match.search.receiveCode !== '' ||
        match.search.provideCode !== '',
    }),
  component: Page,
});
export { Route };
