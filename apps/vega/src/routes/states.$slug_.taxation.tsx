import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadTaxation } from '../taxation/public-data';
import { PublicTaxationPage } from '../taxation/public';
import { metadata } from '../metadata';
import { displayText } from '../states/text';

const route = getRouteApi('/states/$slug_/taxation');
function Page(): ReactElement {
  const { taxation } = route.useLoaderData();
  return (
    <main id="main-content">
      <PageContainer>
        <PublicTaxationPage item={taxation} />
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/states/$slug_/taxation')({
  loader: async ({ params, context }) => {
    const result = await loadTaxation({ data: { slug: params.slug, locale: context.locale } });
    if (result.taxation === null) {
      throw notFound();
    }
    return { ...result, taxation: result.taxation };
  },
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: loaderData
        ? displayText(loaderData.taxation.office.name, match.context.locale)
        : 'Taxation',
      description: loaderData
        ? displayText(loaderData.taxation.office.description, match.context.locale)
        : '',
      path: `/states/${match.params.slug}/taxation`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
