// oxlint-disable node/no-process-env -- Public SSR uses a dedicated cookie-free API client and reads only explicitly published projections.
import { createServerFn } from '@tanstack/react-start';
import {
  createClient,
  getPublishedCompanyProfile,
  listPublishedCompanyBranches,
  getSite,
} from '@helicraft/alhena';
import { z } from 'zod';
import { profileSearch } from './profile-search';

const NOT_FOUND = 404;

const loadCompanyProfile = createServerFn({ method: 'GET' })
  .validator(profileSearch.extend({ id: z.uuid(), locale: z.enum(['ru', 'en']) }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const [site, profile, branches] = await Promise.all([
      getSite({ client, throwOnError: true }),
      getPublishedCompanyProfile({
        client,
        path: { id: data.id },
        query: data,
        throwOnError: false,
      }).catch(() => null),
      listPublishedCompanyBranches({
        client,
        path: { id: data.id },
        query: { page: data.branchesPage },
        throwOnError: false,
      }).catch(() => null),
    ]);
    return {
      site: site.data,
      profile: profile?.data ?? null,
      missing: profile?.response?.status === NOT_FOUND,
      branches: branches?.data ?? null,
    };
  });
export { loadCompanyProfile };
