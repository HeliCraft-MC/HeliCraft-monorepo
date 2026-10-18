import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadPublicState } from '../states/public-data';
import { StateDetailView } from '../states/detail';
import { displayText, uiText } from '../states/text';
import { HTTP } from '../http-status';
import { metadata } from '../metadata';

const routeApi = getRouteApi('/states/$slug');
function Page(): ReactElement {
  const data = routeApi.useLoaderData();
  return (
    <main id="main-content">
      <PageContainer>
        {data.state && <StateDetailView state={data.state} publicView />}
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/states/$slug')({
  loader: async ({ params, context }) => {
    const data = await loadPublicState({ data: { slug: params.slug, locale: context.locale } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.state) {
      throw new Error('State unavailable');
    }
    return data;
  },
  head: ({ loaderData, match }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: loaderData?.state
        ? displayText(loaderData.state.configuration.name, match.context.locale)
        : uiText(match.context.locale, 'Государство не найдено', 'State not found'),
      description: loaderData?.state
        ? displayText(loaderData.state.configuration.description, match.context.locale)
        : '',
      path: `/states/${match.params.slug}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
