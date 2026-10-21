// oxlint-disable import/max-dependencies -- The API security scenario combines the real session boundary, immutable registration and PostgreSQL-backed corporate participation.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import { z } from '@hono/zod-openapi';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyRegistrationService } from '../src/modules/companies/registration';
import { CompanyPersonalConsentViewSchema } from '../src/modules/companies/registration-contracts';
import {
  CompanyApplicationSchema,
  CompanyApplicationsSchema,
} from '../src/modules/companies/application-contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import {
  freeCompanyPolicy,
  officeCompanyConfiguration,
  prepareCompany,
  submitPreparedCompany,
} from './companies-fixture';

const ORIGIN = 'https://registration.test';
function authenticated(token: string, method = 'GET', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      Origin: ORIGIN,
      Cookie: `helicraft_session=${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
// oxlint-disable-next-line max-lines-per-function -- The suite scopes one complete protected registration lifecycle to a disposable PostgreSQL database.
describe('protected registration projections', () => {
  // oxlint-disable-next-line max-lines-per-function -- This real-database lifecycle verifies persisted consent revocation and immutable application access before testing legal-entity founder read roles.
  it('retains revocable personal consent after reload and exposes applications only to their participants and state workspace', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const state = await monetaryFixture(db, 'Rd');
      await addEconomicAuthority(db, state);
      await new MonetaryDirectiveService(db).create(
        state.stateId,
        { id: state.founderId, admin: false },
        {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'SET_COMPANY_REGISTRATION_POLICY',
            baseRevisionId: null,
            policy: freeCompanyPolicy,
          },
        },
      );
      const identity = new IdentityService(db);
      const token = await identity.register('RegReader', 'A sufficiently long password');
      const outsider = await identity.register('RegOut', 'A sufficiently long password');
      const applicant = await new SessionService(db).authenticate(token);
      const draft = await prepareCompany(db, {
        applicantId: applicant.principal.id,
        configuration: officeCompanyConfiguration(applicant.principal.id, state.stateId),
      });
      const app = createApp({
        db,
        siteOrigin: ORIGIN,
        checkReady: async (): Promise<void> => {
          await database.pool.query('select 1');
        },
      });
      const consentPath = `/api/v1/account/company-drafts/${draft.id}/consents`;
      expect((await app.request(consentPath)).status).toBe(401);
      expect((await app.request(consentPath, authenticated(outsider))).status).toBe(404);
      const consents = z
        .object({ items: z.array(CompanyPersonalConsentViewSchema) })
        .parse(await (await app.request(consentPath, authenticated(token))).json());
      expect(consents.items).toHaveLength(2);
      const founder = consents.items.find((item) => item.role === 'FOUNDER');
      if (founder === undefined) {
        throw new Error('Founder consent missing');
      }
      expect(
        (
          await app.request(
            `/api/v1/account/company-consents/${founder.id}/revoke`,
            authenticated(token, 'POST'),
          )
        ).status,
      ).toBe(200);
      const afterReload = z
        .object({ items: z.array(CompanyPersonalConsentViewSchema) })
        .parse(await (await app.request(consentPath, authenticated(token))).json());
      expect(afterReload.items.find((item) => item.id === founder.id)?.revokedAt).not.toBeNull();
      const registration = new CompanyRegistrationService(db);
      expect((await registration.review(draft.id, applicant.principal.id)).ready).toBe(false);
      expect(
        (
          await app.request(
            consentPath,
            authenticated(token, 'POST', {
              role: 'FOUNDER',
              formationHash: draft.formationHash,
              idempotencyKey: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(200);
      await submitPreparedCompany(db, draft);
      const submitted = await new CompanyDraftService(db).get(draft.id, applicant.principal.id);
      const applicationPath = `/api/v1/account/company-applications/${submitted.submittedApplicationId}`;
      expect((await app.request(applicationPath, authenticated(outsider))).status).toBe(404);
      const response = await app.request(applicationPath, authenticated(token));
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const application = CompanyApplicationSchema.parse(await response.json());
      expect(application.status).toBe('APPROVED');
      expect(application.configuration).toEqual(draft.configuration);
      const stateToken = await identity.login('MoneyFounderRd', 'A sufficiently long password');
      const statePath = `/api/v1/account/states/${state.stateId}/company-applications`;
      expect((await app.request(statePath, authenticated(outsider))).status).toBe(404);
      const queue = CompanyApplicationsSchema.parse(
        await (await app.request(statePath, authenticated(stateToken))).json(),
      );
      expect(queue.items.map((item) => item.id)).toContain(application.id);
      const child = await new CompanyDraftService(db).create(
        state.founderId,
        'Entity founder review',
      );
      const corporateDraft = await new CompanyDraftService(db).save(child.id, state.founderId, {
        title: child.title,
        step: 0,
        version: child.version,
        configuration: {
          ...draft.configuration,
          allocations: [
            {
              owner: { type: 'COMPANY', id: draft.companyId },
              shares: draft.configuration.totalShares,
            },
          ],
          charter: { ...draft.configuration.charter, offices: [], policies: [] },
        },
      });
      const childPath = `/api/v1/account/company-drafts/${corporateDraft.id}`;
      expect((await app.request(childPath, authenticated(token))).status).toBe(200);
      expect((await app.request(childPath, authenticated(outsider))).status).toBe(404);
      expect(
        (
          await app.request(
            `${childPath}/consents`,
            authenticated(token, 'POST', {
              role: 'FOUNDER',
              formationHash: corporateDraft.formationHash,
              idempotencyKey: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(403);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
