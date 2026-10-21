// oxlint-disable max-lines -- One disposable API history covers private registration, immutable corporate decisions and consented stock settlement.
// oxlint-disable import/max-dependencies -- HTTP security and registration exercise the real app, session authentication and PostgreSQL domain services.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { z } from '@hono/zod-openapi';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import { companies, companyShareEvents } from '../src/db/schema';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import {
  CompanyDraftSchema,
  CompanyRegistrationReviewSchema,
} from '../src/modules/companies/registration-contracts';
import {
  CompanyWorkspaceSchema,
  CompanyDecisionDetailSchema,
} from '../src/modules/companies/read-contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import { freeCompanyPolicy, officeCompanyConfiguration } from './companies-fixture';
import { assertCompanyLifecycleHttp } from './company-lifecycle-http-fixture';
import { assertShareHttp } from './company-shares-http-fixture';
import { assertPublicCompanyProfile } from './company-profile-http-fixture';

const ORIGIN = 'https://helicraft.test';
function request(method: string, token: string, body?: unknown): RequestInit {
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
// oxlint-disable-next-line max-lines-per-function -- The suite keeps the HTTP authorization, consent and idempotent registration lifecycle together.
describe('company registration HTTP boundary', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- The actual API scenario covers private drafts, malformed requests, CSRF, participant consent and a single initial issuance.
  it('authenticates every draft command and binds consent and registration to server-derived participants', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const state = await monetaryFixture(db, 'Ht');
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
      const token = await identity.register('CompanyApplicant', 'A sufficiently long password');
      const outsiderToken = await identity.register(
        'CompanyOutsider',
        'A sufficiently long password',
      );
      const applicant = await new SessionService(db).authenticate(token);
      const app = createApp({
        db,
        siteOrigin: ORIGIN,
        checkReady: async () => {
          await Promise.resolve();
        },
      });
      const path = '/api/v1/account/company-drafts';
      expect((await app.request(path)).status).toBe(401);
      expect(
        (
          await app.request(path, {
            method: 'POST',
            headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Unauthenticated' }),
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await app.request(path, {
            ...request('POST', token, { title: 'CSRF' }),
            headers: {
              Origin: 'https://other.test',
              Cookie: `helicraft_session=${token}`,
              'Content-Type': 'application/json',
            },
          })
        ).status,
      ).toBe(403);
      const created = await app.request(path, request('POST', token, { title: 'HTTP company' }));
      expect(created.status).toBe(200);
      expect(created.headers.get('Cache-Control')).toBe('no-store');
      const initial = CompanyDraftSchema.parse(await created.json());
      const draftPath = `${path}/${initial.id}`;
      expect((await app.request(draftPath, request('GET', outsiderToken))).status).toBe(404);
      const save = {
        version: initial.version,
        title: initial.title,
        step: 5,
        configuration: {
          ...officeCompanyConfiguration(applicant.principal.id, state.stateId),
          document: { en: '# Charter\n[Unsafe](javascript:alert(1))\n<script>alert(1)</script>' },
        },
      };
      expect((await app.request(draftPath, request('PUT', outsiderToken, save))).status).toBe(404);
      expect(
        (
          await app.request(
            draftPath,
            request('DELETE', outsiderToken, { version: initial.version }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await app.request(
            draftPath,
            request('PUT', token, {
              ...save,
              configuration: { ...save.configuration, totalShares: 37 },
            }),
          )
        ).status,
      ).toBe(400);
      const saved = await app.request(draftPath, request('PUT', token, save));
      expect(saved.status).toBe(200);
      const draft = CompanyDraftSchema.parse(await saved.json());
      expect((await app.request(draftPath, request('PUT', token, save))).status).toBe(409);
      const notReady = CompanyRegistrationReviewSchema.parse(
        await (await app.request(`${draftPath}/review`, request('POST', token))).json(),
      );
      expect(notReady.ready).toBe(false);
      const command = {
        version: draft.version,
        formationHash: draft.formationHash,
        policyRevisionId: notReady.policyRevisionId,
        idempotencyKey: crypto.randomUUID(),
      };
      expect(
        (await app.request(`${draftPath}/submit`, request('POST', token, command))).status,
      ).toBe(409);
      const consent = {
        role: 'FOUNDER',
        formationHash: draft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      };
      expect(
        (await app.request(`${draftPath}/consents`, request('POST', outsiderToken, consent)))
          .status,
      ).toBe(403);
      expect(
        (
          await app.request(
            `${draftPath}/consents`,
            request('POST', token, { ...consent, actorId: state.founderId }),
          )
        ).status,
      ).toBe(400);
      expect(
        (await app.request(`${draftPath}/consents`, request('POST', token, consent))).status,
      ).toBe(200);
      expect(
        (
          await app.request(
            `${draftPath}/consents`,
            request('POST', token, {
              ...consent,
              role: 'OFFICE_HOLDER',
              idempotencyKey: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(200);
      const ready = CompanyRegistrationReviewSchema.parse(
        await (await app.request(`${draftPath}/review`, request('POST', token))).json(),
      );
      expect(ready.ready).toBe(true);
      const submitted = await app.request(`${draftPath}/submit`, request('POST', token, command));
      expect(submitted.status).toBe(200);
      const result: unknown = await submitted.json();
      const replay = await app.request(`${draftPath}/submit`, request('POST', token, command));
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual(result);
      expect(
        (
          await app.request(
            `${draftPath}/submit`,
            request('POST', token, { ...command, formationHash: '0'.repeat(64) }),
          )
        ).status,
      ).toBe(409);
      expect(await db.select().from(companyShareEvents)).toHaveLength(1);
      expect(
        (await db.select().from(companies).where(eq(companies.id, draft.companyId)))[0]?.status,
      ).toBe('ACTIVE');
      const workspacePath = `/api/v1/account/companies/${draft.companyId}`;
      expect((await app.request(workspacePath)).status).toBe(401);
      expect((await app.request(workspacePath, request('GET', outsiderToken))).status).toBe(404);
      const workspaceResponse = await app.request(workspacePath, request('GET', token));
      expect(workspaceResponse.status).toBe(200);
      const workspace = CompanyWorkspaceSchema.parse(await workspaceResponse.json());
      const change = {
        revisionId: workspace.currentRevisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'UPDATE_PROFILE',
          name: { en: 'Approved HTTP profile', ru: 'Одобренный профиль' },
          description: {},
          categories: [],
        },
      };
      expect(
        (await app.request(`${workspacePath}/decisions`, request('POST', outsiderToken, change)))
          .status,
      ).toBe(403);
      const decisionResponse = await app.request(
        `${workspacePath}/decisions`,
        request('POST', token, change),
      );
      expect(decisionResponse.status).toBe(200);
      const changedRevisionId = (
        await db.select().from(companies).where(eq(companies.id, draft.companyId))
      )[0]?.currentRevisionId;
      expect(changedRevisionId).not.toBe(workspace.currentRevisionId);
      const summaryResponse = await app.request(
        `${workspacePath}/decisions`,
        request('GET', token),
      );
      expect(summaryResponse.status).toBe(200);
      const decisionJson: unknown = await decisionResponse.json();
      const parsedId = z.object({ id: z.uuid() }).parse(decisionJson).id;
      const decisionPath = `/api/v1/account/company-decisions/${parsedId}`;
      expect((await app.request(decisionPath, request('GET', outsiderToken))).status).toBe(404);
      const detail = CompanyDecisionDetailSchema.parse(
        await (await app.request(decisionPath, request('GET', token))).json(),
      );
      expect(detail).toMatchObject({
        status: 'APPLIED',
        canApply: false,
        canCancel: false,
        payload: change.payload,
      });
      await expect(
        db
          .update(companies)
          .set({ currentRevisionId: workspace.currentRevisionId })
          .where(eq(companies.id, draft.companyId)),
      ).rejects.toThrow();
      const deletedDraft = CompanyDraftSchema.parse(
        await (await app.request(path, request('POST', token, { title: 'Withdraw' }))).json(),
      );
      expect(
        (
          await app.request(
            `${path}/${deletedDraft.id}`,
            request('DELETE', token, { version: deletedDraft.version }),
          )
        ).status,
      ).toBe(200);
      expect((await app.request(`${path}/${deletedDraft.id}`, request('GET', token))).status).toBe(
        404,
      );
      expect(
        (await db.select().from(companies).where(eq(companies.id, deletedDraft.companyId)))[0]
          ?.status,
      ).toBe('CLOSED');
      expect((await app.request(`/api/v1/public/company-drafts/${draft.id}`)).status).toBe(404);
      if (changedRevisionId === undefined || changedRevisionId === null) {
        throw new Error('Changed charter missing');
      }
      await assertPublicCompanyProfile(app, {
        companyId: draft.companyId,
        hiddenCompanyId: deletedDraft.companyId,
        ownerId: applicant.principal.id,
      });
      const recipient = await new SessionService(db).authenticate(outsiderToken);
      const strangerToken = await identity.register(
        'StockStranger',
        'A sufficiently long password',
      );
      await assertShareHttp(app, {
        operation: {
          kind: 'TRANSFER',
          operationId: crypto.randomUUID(),
          issuerId: draft.companyId,
          issuerRevisionId: changedRevisionId,
          owner: { type: 'PLAYER', id: applicant.principal.id },
          recipient: { type: 'PLAYER', id: recipient.principal.id },
          shares: '1',
        },
        ownerToken: token,
        recipientToken: outsiderToken,
        outsiderToken: strangerToken,
        origin: ORIGIN,
      });
      await assertCompanyLifecycleHttp(app, {
        companyId: draft.companyId,
        closedCompanyId: deletedDraft.companyId,
        ownerToken: token,
        outsiderToken: strangerToken,
        adminToken: await identity.login('MoneyReviewerHt', 'A sufficiently long password'),
        origin: ORIGIN,
      });
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
