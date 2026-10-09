// oxlint-disable node/no-process-env -- Environment access is confined to createServerFn handlers and stripped from the client bundle.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getSite, listChronicle } from '@helicraft/alhena';
import { z } from 'zod';

const PAGE_SIZE = 20;
const loadChronicle = createServerFn({ method: 'GET' })
  .validator(z.object({ page: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const { data: site } = await getSite({ client, throwOnError: true });
    const response = await listChronicle({
      client,
      query: { page: data.page, pageSize: PAGE_SIZE },
      throwOnError: false,
    });
    return { site, chronicle: response.data ?? null, page: data.page, pageSize: PAGE_SIZE };
  });
export { loadChronicle };
