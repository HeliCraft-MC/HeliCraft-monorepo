import type { OpenAPIHono } from '@hono/zod-openapi';
import { expect } from 'vitest';
import { PublishedCompanyProfileSchema } from '../src/modules/companies/profile-contracts';
import { HTTP } from '../src/modules/errors';

// oxlint-disable-next-line max-statements -- The public response is checked together with anonymous access, exact ownership, sanitization and sitemap privacy.
async function assertPublicCompanyProfile(
  app: OpenAPIHono,
  input: Readonly<{ companyId: string; hiddenCompanyId: string; ownerId: string }>,
): Promise<void> {
  const path = `/api/v1/public/companies/${input.companyId}?locale=ru`;
  const response = await app.request(path, {
    headers: { Cookie: 'helicraft_session=invalid-and-irrelevant' },
  });
  expect(response.status).toBe(HTTP.ok);
  const json: unknown = await response.json();
  const profile = PublishedCompanyProfileSchema.parse(json);
  expect(profile.identity.name.ru).toBe('Одобренный профиль');
  expect(profile.issuedShares).toBe('37');
  expect(profile.owners.items[0]).toMatchObject({
    identity: { owner: { type: 'PLAYER', id: input.ownerId }, name: { en: 'CompanyApplicant' } },
    shares: '37',
  });
  expect(profile.holders[0]?.player.owner.id).toBe(input.ownerId);
  expect(profile.charter.offices[0]?.name.ru).toBe('Уполномоченный представитель');
  expect(profile.documentHtml).toContain('hc-heading-charter');
  expect(profile.documentHtml).not.toContain('<script');
  expect(profile.documentHtml).not.toMatch(/javascript:/u);
  expect(profile.history.items.map((event) => event.kind)).toEqual(['UPDATE_PROFILE']);
  expect(JSON.stringify(json)).not.toMatch(
    /"(?:accounts|transactions|calculation|quoteId|balanceMinor|payloadHash|formationHash|approvals|manualReason|createdBy)":/u,
  );
  const hidden = await app.request(`/api/v1/public/companies/${input.hiddenCompanyId}`);
  expect(hidden.status).toBe(HTTP.notFound);
  const sitemapResponse = await app.request('/api/v1/public/sitemap.xml');
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`/companies/${input.companyId}`);
  expect(sitemap).not.toContain(input.hiddenCompanyId);
}
export { assertPublicCompanyProfile };
