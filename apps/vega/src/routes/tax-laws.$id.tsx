import { z } from 'zod';
import { PublicHistoryPagination } from '../taxation/public-pagination';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadTaxLaw } from '../taxation/public-data';
import { PublicLaw } from '../taxation/public';
import { metadata } from '../metadata';
import { displayText, uiText } from '../states/text';
import { useTranslation } from '../i18n';

const route = getRouteApi('/tax-laws/$id');
function Page(): ReactElement {
  const { law } = route.useLoaderData();
  const { id } = route.useParams();
  const { locale } = useTranslation();
  return (
    <main id="main-content">
      <PageContainer>
        <h1>
          {displayText(law.revisions[0]?.name ?? {}, locale) ||
            uiText(locale, 'Налоговый закон', 'Tax law')}
        </h1>
        <p>{uiText(locale, 'Опубликованная история закона', 'Published law history')}</p>
        {law.revisions.length === 0 && (
          <p>{uiText(locale, 'На этой странице редакций нет.', 'No revisions on this page.')}</p>
        )}
        {law.revisions.map((revision) => (
          <PublicLaw key={revision.id} revision={revision} />
        ))}
        <PublicHistoryPagination path={`/tax-laws/${id}`} page={law.page} hasMore={law.hasMore} />
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/tax-laws/$id')({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, context, deps }) => {
    const result = await loadTaxLaw({
      data: { id: params.id, locale: context.locale, page: deps.page },
    });
    if (result.law === null) {
      throw notFound();
    }
    return { ...result, law: result.law };
  },
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: loaderData
        ? displayText(loaderData.law.revisions[0]?.name ?? {}, match.context.locale)
        : 'Tax law',
      description: loaderData
        ? displayText(loaderData.law.revisions[0]?.description ?? {}, match.context.locale)
        : '',
      path: `/tax-laws/${match.params.id}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
