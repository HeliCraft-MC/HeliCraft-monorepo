import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PublicPoliticalMap } from '../spatial/public-page';
import { mapSearch, loadPoliticalMap } from '../spatial/public-data';
import { metadata } from '../metadata';
import { uiText } from '../states/text';

const route = getRouteApi('/map');
function Page(): ReactElement {
  const search = route.useSearch();
  return (
    <PublicPoliticalMap key={JSON.stringify(search)} data={route.useLoaderData()} search={search} />
  );
}
const Route = createFileRoute('/map')({
  validateSearch: mapSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => await loadPoliticalMap({ data: deps }),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site.serverName,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Политическая карта', 'Political map'),
      description: uiText(
        match.context.locale,
        'Карта мира Minecraft и утверждённые территории государств {serverName}.',
        'Minecraft world map and ratified state territories of {serverName}.',
      ),
      path: '/map',
      noindex: loaderData?.snapshot === null,
    }),
  component: Page,
});
export { Route };
