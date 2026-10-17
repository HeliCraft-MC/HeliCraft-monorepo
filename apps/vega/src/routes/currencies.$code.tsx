import { z } from 'zod';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadCurrency } from '../monetary/public-data';
import { PublicCurrencyPage } from '../monetary/public-currency';
import { metadata } from '../metadata';
import { displayText } from '../states/text';

const route = getRouteApi('/currencies/$code');
function Page(): ReactElement {
  const { currency } = route.useLoaderData();
  return (
    <main id="main-content">
      <PageContainer>
        <PublicCurrencyPage item={currency} />
      </PageContainer>
    </main>
  );
}
const Route = createFileRoute('/currencies/$code')({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const result = await loadCurrency({ data: { ...params, page: deps.page } });
    if (result.currency === null) {
      throw notFound();
    }
    return { ...result, currency: result.currency };
  },
  head: ({ match, loaderData }) =>
    metadata({
      locale: match.context.locale,
      title: loaderData
        ? `${displayText(loaderData.currency.currency.name, match.context.locale)} · ${loaderData.currency.currency.code}`
        : 'Currency',
      description: loaderData
        ? displayText(loaderData.currency.currency.description, match.context.locale)
        : '',
      path: `/currencies/${match.params.code}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
