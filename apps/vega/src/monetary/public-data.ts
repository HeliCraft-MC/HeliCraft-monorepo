// oxlint-disable node/no-process-env -- Public SSR uses a separate client with credentials omitted.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getSite, listPublicCurrencies, getPublicCurrency } from '@helicraft/alhena';
import { HTTP } from '../http-status';
import { z } from 'zod';

const loadCurrencies = createServerFn({ method: 'GET' })
  .validator(z.object({ after: z.string().optional() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await listPublicCurrencies({ client, query: data, throwOnError: false }).catch(
      () => null,
    );
    return {
      site: site.data,
      currencies: result?.data?.items ?? null,
      nextCode: result?.data?.nextCode ?? null,
    };
  });
const loadCurrency = createServerFn({ method: 'GET' })
  .validator(z.object({ code: z.string(), page: z.number() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await getPublicCurrency({
      client,
      path: { code: data.code },
      query: { page: data.page },
      throwOnError: false,
    });
    return {
      site: site.data,
      currency: result.data ?? null,
      status: result.response?.status ?? HTTP.unavailable,
    };
  });
export { loadCurrencies, loadCurrency };
