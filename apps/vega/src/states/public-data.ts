// oxlint-disable node/no-process-env -- Public SSR explicitly omits credentials and never reads private drafts.
import { createServerFn } from '@tanstack/react-start';
import { directorySearch } from './directory-search';
import { HTTP } from '../http-status';
import { z } from 'zod';
import { createClient, getPublicState, getSite, listStates } from '@helicraft/alhena';

const loadStates = createServerFn({ method: 'GET' })
  .validator(directorySearch.extend({ locale: z.enum(['ru', 'en']) }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await listStates({ client, query: data, throwOnError: false }).catch(() => null);
    return { site: site.data, directory: result?.data ?? null };
  });
const loadPublicState = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string(), locale: z.enum(['ru', 'en']) }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await getPublicState({
      client,
      path: { slug: data.slug },
      query: { locale: data.locale },
      throwOnError: false,
    });
    return {
      site: site.data,
      state: result.data ?? null,
      status: result.response?.status ?? HTTP.unavailable,
    };
  });
export { loadStates, loadPublicState };
