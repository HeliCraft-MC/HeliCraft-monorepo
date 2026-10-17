// oxlint-disable node/no-process-env -- Public SSR creates an independent client and never forwards session credentials.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  createClient,
  getSite,
  getPublicState,
  getPublicTaxation,
  getPublicTaxLaw,
  getPublicTreaty,
  listPublicTreaties,
} from '@helicraft/alhena';

const input = z.object({ locale: z.enum(['ru', 'en']) });
const pageInput = input.extend({ page: z.number().int().min(1).default(1) });
const loadTaxation = createServerFn({ method: 'GET' })
  .validator(input.extend({ slug: z.string() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const state = await getPublicState({
      client,
      path: { slug: data.slug },
      query: { locale: data.locale },
      throwOnError: false,
    });
    const result =
      state.data === undefined
        ? null
        : await getPublicTaxation({
            client,
            path: { stateId: state.data.id },
            query: { locale: data.locale },
            throwOnError: false,
          });
    return { site: site.data, state: state.data ?? null, taxation: result?.data ?? null };
  });
const loadTaxLaw = createServerFn({ method: 'GET' })
  .validator(pageInput.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await getPublicTaxLaw({
      client,
      path: { id: data.id },
      query: { locale: data.locale, page: data.page },
      throwOnError: false,
    });
    return { site: site.data, law: result.data ?? null };
  });
const loadTreaties = createServerFn({ method: 'GET' })
  .validator(pageInput)
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await listPublicTreaties({ client, query: data, throwOnError: false });
    return {
      site: site.data,
      items: result.data?.items ?? null,
      page: data.page,
      hasMore: result.data?.hasMore ?? false,
    };
  });
const loadTreaty = createServerFn({ method: 'GET' })
  .validator(pageInput.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await getPublicTreaty({
      client,
      path: { id: data.id },
      query: { locale: data.locale, page: data.page },
      throwOnError: false,
    });
    return { site: site.data, treaty: result.data ?? null };
  });
export { loadTaxation, loadTaxLaw, loadTreaties, loadTreaty };
