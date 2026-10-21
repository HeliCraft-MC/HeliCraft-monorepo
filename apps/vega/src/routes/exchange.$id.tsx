import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PublicFxOfferPage } from '../fx/public-offer';
import { fxSearch, loadFxOffer } from '../fx/public-data';
import { metadata } from '../metadata';
import { uiText } from '../states/text';

const route = getRouteApi('/exchange/$id');
function Page(): ReactElement {
  const data = route.useLoaderData();
  return <PublicFxOfferPage offer={data.offer} fills={data.fills} />;
}
const Route = createFileRoute('/exchange/$id')({
  validateSearch: fxSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const data = await loadFxOffer({ data: { ...deps, id: params.id } });
    if (data.missing) {
      throw notFound();
    }
    return data;
  },
  notFoundComponent: () => <PublicFxOfferPage offer={null} fills={null} missing />,
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site.serverName,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Условия обмена', 'Exchange terms'),
      description: uiText(
        match.context.locale,
        'Точные условия и обеспеченный остаток валютного предложения.',
        'Exact terms and reserved availability of a currency offer.',
      ),
      path: `/exchange/${match.params.id}`,
      noindex: !loaderData?.offer || match.search.page > 1,
    }),
  component: Page,
});
export { Route };
