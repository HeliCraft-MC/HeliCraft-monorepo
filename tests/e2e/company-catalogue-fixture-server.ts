// oxlint-disable no-magic-numbers -- Fixed public data, statuses and ports belong only to this isolated SSR/browser fixture.
import { createApp } from '../../apps/antares/src/app';
import { CompanyCatalogueQuerySchema } from '../../apps/antares/src/modules/companies/catalogue-contracts';
import { profileFixture, branchFixture } from './company-profile-public-fixture';
import type {
  CompanyCatalogue,
  PublicSite,
  PublishedCompanyIdentity,
} from '../../packages/alhena/src';

const STATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const jurisdiction = {
  id: STATE_ID,
  name: { en: 'Published jurisdiction', ru: 'Государство регистрации' },
};
const identities: PublishedCompanyIdentity[] = Array.from({ length: 25 }, (_value, index) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index + 1).padStart(12, '0')}`,
  name: { en: `Published company ${index + 1}`, ru: `Опубликованная компания ${index + 1}` },
  description: {
    en: 'Published legal identity. '.repeat(12),
    ru: 'Опубликованные сведения о компании. '.repeat(12),
  },
  status: 'ACTIVE',
  registrationStateId: STATE_ID,
  registrationStateName: jurisdiction.name,
  foundedAt: '2026-10-18T23:00:00.000Z',
}));
const site: PublicSite = {
  serverName: 'Catalogue Test Realm',
  githubUrl: 'https://example.test/source',
  logoUrl: null,
  phase: 'PRELAUNCH',
  registrationEnabled: false,
  minecraftAddress: null,
  canonicalOrigin: 'https://catalogue.example.test',
  links: [],
};
let mode = 'normal';
let observations: { path: string; cookie: string | null; query: Record<string, string> }[] = [];
const app = createApp({
  siteOrigin: 'http://localhost:5186',
  checkReady: async () => {
    await Promise.resolve();
  },
});
function catalogueResponse(url: URL): Response {
  if (mode === 'outage') {
    return Response.json({ message: 'Fixture outage' }, { status: 503 });
  }
  const query = CompanyCatalogueQuerySchema.parse(Object.fromEntries(url.searchParams));
  const result: CompanyCatalogue = {
    items: mode === 'empty' ? [] : identities.slice((query.page - 1) * 12, query.page * 12),
    total: mode === 'empty' ? 0 : 25,
    page: query.page,
    pageSize: 12,
    jurisdictions: [jurisdiction],
  };
  return Response.json(result);
}
function companyResponse(url: URL): Response | null {
  const identity = identities.find(
    (company) =>
      url.pathname === `/api/v1/public/companies/${company.id}` ||
      url.pathname === `/api/v1/public/companies/${company.id}/branches`,
  );
  if (identity === undefined) {
    return null;
  }
  return mode === 'outage'
    ? Response.json({ message: 'Fixture outage' }, { status: 503 })
    : Response.json(
        url.pathname.endsWith('/branches') ? branchFixture(identity.id) : profileFixture(identity),
      );
}
Bun.serve({
  hostname: '127.0.0.1',
  port: 3116,
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__test/catalogue') {
      mode = url.searchParams.get('mode') ?? 'normal';
      observations = [];
      return Response.json({ mode });
    }
    if (url.pathname === '/__test/observed') {
      return Response.json({ observations });
    }
    if (url.pathname.startsWith('/api/v1/public/')) {
      observations.push({
        path: url.pathname,
        cookie: request.headers.get('cookie'),
        query: Object.fromEntries(url.searchParams),
      });
    }
    if (url.pathname === '/api/v1/public/site') {
      return Response.json(site);
    }
    if (url.pathname === '/api/v1/public/pages') {
      return Response.json({ items: [], total: 0 });
    }
    if (url.pathname === '/api/v1/public/companies/catalogue') {
      return catalogueResponse(url);
    }
    return companyResponse(url) ?? (await app.fetch(request));
  },
});
