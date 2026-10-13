// oxlint-disable node/no-process-env -- Public SSR uses the server-only API origin and explicitly omits credentials.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient, getPublicPlayerProfile, getSite } from '@helicraft/alhena';
import { HTTP } from './http-status';

const loadPublicPlayer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const result = await getPublicPlayerProfile({
      client,
      path: { id: data.id },
      throwOnError: false,
    });
    return {
      site: site.data,
      player: result.data ?? null,
      status: result.response?.status ?? HTTP.unavailable,
    };
  });
export { loadPublicPlayer };
