import { z } from 'zod';
import { PublicHistoryPagination } from '../taxation/public-pagination';
import { economicStatus } from '../taxation/model';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer, Alert } from '@helicraft/atria';
import { loadTreaties } from '../taxation/public-data';
import { metadata } from '../metadata';
import { displayText, uiText } from '../states/text';
import { useTranslation } from '../i18n';

const route = getRouteApi('/treaties/');
function Page(): ReactElement {
  const { items, page, hasMore } = route.useLoaderData();
  const { locale } = useTranslation();
  return (
    <main id="main-content">
      <PageContainer>
        <h1>{uiText(locale, 'Международные договоры', 'International treaties')}</h1>
        {items === null && (
          <Alert tone="danger">
            {uiText(
              locale,
              'Договоры временно недоступны.',
              'Treaties are temporarily unavailable.',
            )}
          </Alert>
        )}
        {items?.length === 0 && (
          <p>
            {uiText(locale, 'Опубликованных договоров пока нет.', 'No published treaties yet.')}
          </p>
        )}
        <ul>
          {items?.map((item) => (
            <li key={item.id}>
              <a href={`/treaties/${item.id}`}>
                {displayText(item.revisions[0]?.name ?? {}, locale)}
              </a>{' '}
              · {economicStatus(locale, item.status)} ·{' '}
              {item.parties.map((party) => displayText(party.name, locale)).join(' ↔ ')}
            </li>
          ))}
        </ul>
        <PublicHistoryPagination path="/treaties" page={page} hasMore={hasMore} />
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/treaties/')({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) =>
    await loadTreaties({ data: { locale: context.locale, page: deps.page } }),
  head: ({ match, loaderData }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title: uiText(match.context.locale, 'Международные договоры', 'International treaties'),
      description: uiText(
        match.context.locale,
        'Ратифицированные двусторонние соглашения государств {serverName}',
        'Ratified bilateral {serverName} state agreements',
      ),
      path: '/treaties',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
