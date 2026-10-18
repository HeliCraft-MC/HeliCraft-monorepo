import { z } from 'zod';
import { PublicHistoryPagination } from '../taxation/public-pagination';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadTreaty } from '../taxation/public-data';
import { PublicTreatyPage } from '../taxation/public';
import { metadata } from '../metadata';
import { displayText } from '../states/text';

const route = getRouteApi('/treaties/$id');
function Page(): ReactElement {
  const { treaty } = route.useLoaderData();
  return (
    <main id="main-content">
      <PageContainer>
        <PublicTreatyPage item={treaty} />
        <PublicHistoryPagination
          path={`/treaties/${treaty.id}`}
          page={treaty.page}
          hasMore={treaty.hasMore}
        />
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/treaties/$id')({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, context, deps }) => {
    const result = await loadTreaty({
      data: { id: params.id, locale: context.locale, page: deps.page },
    });
    if (result.treaty === null) {
      throw notFound();
    }
    return { ...result, treaty: result.treaty };
  },
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: loaderData ? displayText(loaderData.treaty.name, match.context.locale) : 'Treaty',
      description: loaderData
        ? displayText(loaderData.treaty.revisions[0]?.description ?? {}, match.context.locale)
        : '',
      path: `/treaties/${match.params.id}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
