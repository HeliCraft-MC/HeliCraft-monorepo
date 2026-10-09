// oxlint-disable node/no-process-env -- Environment access is confined to createServerFn handlers and stripped from the client bundle.
import { HTTP } from './http-status';
import { createServerFn } from '@tanstack/react-start';
import { createClient, getChronicleEntry, getPublicPage, getSite } from '@helicraft/alhena';
import { z } from 'zod';

const loadContent = createServerFn({ method: 'GET' })
  .validator(z.object({ kind: z.enum(['PAGE', 'CHRONICLE']), slug: z.string() }))
  .handler(async ({ data: input }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const { data: site } = await getSite({ client, throwOnError: true });
    const response = await (input.kind === 'PAGE' ? getPublicPage : getChronicleEntry)({
      client,
      path: { slug: input.slug },
      throwOnError: false,
    });
    return {
      content: response.data ?? null,
      status: response.response?.status ?? HTTP.unavailable,
      site,
    };
  });
export { loadContent };
