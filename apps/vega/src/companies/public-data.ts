// oxlint-disable node/no-process-env -- Public SSR creates its own cookie-free API client and never reads account data.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getSite, listCompanyCatalogue } from '@helicraft/alhena';
import { z } from 'zod';
import { catalogueSearch } from './catalogue-search';

const loadCompanyCatalogue = createServerFn({ method: 'GET' })
  .validator(catalogueSearch.extend({ locale: z.enum(['ru', 'en']) }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const [site, catalogue] = await Promise.all([
      getSite({ client, throwOnError: true }),
      listCompanyCatalogue({ client, query: data, throwOnError: false }).catch(() => null),
    ]);
    return { site: site.data, catalogue: catalogue?.data ?? null };
  });
export { loadCompanyCatalogue };
