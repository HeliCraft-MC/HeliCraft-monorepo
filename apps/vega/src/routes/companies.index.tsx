import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyCataloguePage } from '../companies/catalogue';
import { catalogueSearch } from '../companies/catalogue-search';
import { loadCompanyCatalogue } from '../companies/public-data';
import { metadata } from '../metadata';
import { uiText } from '../states/text';

const route = getRouteApi('/companies/');
function Page(): ReactElement {
  const { catalogue } = route.useLoaderData();
  const search = route.useSearch();
  return <CompanyCataloguePage catalogue={catalogue} search={search} />;
}
const Route = createFileRoute('/companies/')({
  validateSearch: catalogueSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, context }) =>
    await loadCompanyCatalogue({ data: { ...deps, locale: context.locale } }),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site.serverName,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Компании', 'Companies'),
      description: uiText(
        match.context.locale,
        'Компании {serverName}: опубликованные сведения и государства регистрации.',
        '{serverName} companies: published identities and registration jurisdictions.',
      ),
      path: '/companies',
      noindex:
        loaderData?.catalogue === null ||
        match.search.search !== '' ||
        match.search.stateId !== '' ||
        match.search.status !== 'ACTIVE' ||
        match.search.sort !== 'NEWEST' ||
        match.search.page > 1,
    }),
  component: Page,
});
export { Route };
