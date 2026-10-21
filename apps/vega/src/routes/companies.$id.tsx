import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { CompanyProfilePage } from '../companies/profile';
import { profileSearch } from '../companies/profile-search';
import { loadCompanyProfile } from '../companies/profile-data';
import { metadata } from '../metadata';
import { displayText, uiText } from '../states/text';

const route = getRouteApi('/companies/$id');
function Page(): ReactElement {
  const data = route.useLoaderData();
  const search = route.useSearch();
  return (
    <CompanyProfilePage
      profile={data.profile}
      branches={data.branches}
      missing={data.missing}
      search={search}
    />
  );
}
const Route = createFileRoute('/companies/$id')({
  validateSearch: profileSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps, context }) => {
    const result = await loadCompanyProfile({
      data: { ...deps, id: params.id, locale: context.locale },
    });
    if (result.missing) {
      throw notFound();
    }
    return result;
  },
  notFoundComponent: () => (
    <CompanyProfilePage profile={null} branches={null} missing search={profileSearch.parse({})} />
  ),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site.serverName,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
      locale: match.context.locale,
      title: loaderData?.profile
        ? displayText(loaderData.profile.identity.name, match.context.locale)
        : uiText(match.context.locale, 'Компания', 'Company'),
      description: loaderData?.profile
        ? displayText(loaderData.profile.identity.description, match.context.locale)
        : '',
      path: `/companies/${match.params.id}`,
      noindex:
        !loaderData?.profile ||
        Object.values(profileSearch.parse(match.search)).some((page) => page > 1),
    }),
  component: Page,
});
export { Route };
