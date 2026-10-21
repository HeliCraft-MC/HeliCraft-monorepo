// oxlint-disable import/max-dependencies -- This scenario proves real state participation and exact mixed-owner formation through existing Governance.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { desc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import {
  companies,
  companyFormationConsents,
  companyShareBalances,
  companyOfficeHolders,
  companyRegistrationPolicyRevisions,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyConsentService } from '../src/modules/companies/consents';
import { CompanyRegistrationService } from '../src/modules/companies/registration';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import { freeCompanyPolicy, officeCompanyConfiguration } from './companies-fixture';

// oxlint-disable-next-line max-lines-per-function -- Related founder identities and policy revisions share one isolated ownership history.
describe('company founders and state-owned shares', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- The scenario separates a foreign applicant from consenting owners and validates the actual state Governance source before exact issuance.
  it('requires each legal owner consent, permits a foreign non-owner applicant and applies foreign founder restrictions to owners', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const home = await monetaryFixture(db, 'Hm');
      const foreign = await monetaryFixture(db, 'Fr');
      await addEconomicAuthority(db, home);
      await addEconomicAuthority(db, foreign);
      const directives = new MonetaryDirectiveService(db);
      const drafts = new CompanyDraftService(db);
      const consents = new CompanyConsentService(db);
      const registrations = new CompanyRegistrationService(db);
      const homeActor = { id: home.founderId, admin: false };
      const stateActor = { id: foreign.founderId, admin: false };
      await directives.create(home.stateId, homeActor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'SET_COMPANY_REGISTRATION_POLICY',
          baseRevisionId: null,
          policy: { ...freeCompanyPolicy, foreignPlayerFounders: 'DENY' },
        },
      });
      const initial = await drafts.create(foreign.founderId, 'Mixed owners');
      const configuration = officeCompanyConfiguration(home.founderId, home.stateId);
      const draft = await drafts.save(initial.id, foreign.founderId, {
        version: initial.version,
        title: initial.title,
        step: 5,
        configuration: {
          ...configuration,
          totalShares: '900719925474099312345678901234',
          allocations: [
            { owner: { type: 'PLAYER', id: home.founderId }, shares: '1' },
            {
              owner: { type: 'STATE', id: foreign.stateId },
              shares: '900719925474099312345678901233',
            },
          ],
          charter: { ...configuration.charter, offices: [], policies: [] },
        },
      });
      await expect(
        consents.grant(draft.id, foreign.founderId, {
          role: 'FOUNDER',
          formationHash: draft.formationHash,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'FORMATION_CONSENT_UNAVAILABLE' });
      await expect(
        consents.grant(draft.id, home.citizenId, {
          role: 'FOUNDER',
          formationHash: draft.formationHash,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'FORMATION_CONSENT_UNAVAILABLE' });
      const playerConsent = await consents.grant(draft.id, home.founderId, {
        role: 'FOUNDER',
        formationHash: draft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      });
      await expect(consents.revoke(playerConsent, foreign.founderId)).rejects.toMatchObject({
        status: 404,
      });
      expect((await registrations.review(draft.id, foreign.founderId)).ready).toBe(false);
      const stateConsentPayload = {
        kind: 'CONSENT_COMPANY_FORMATION' as const,
        companyId: draft.companyId,
        formationHash: draft.formationHash,
      };
      await expect(
        directives.create(foreign.stateId, homeActor, {
          idempotencyKey: crypto.randomUUID(),
          payload: stateConsentPayload,
        }),
      ).rejects.toMatchObject({ status: 404 });
      await directives.create(foreign.stateId, stateActor, {
        idempotencyKey: crypto.randomUUID(),
        payload: stateConsentPayload,
      });
      const stateConsent = (await db.select().from(companyFormationConsents)).find(
        (consent) => consent.subjectId === foreign.stateId,
      );
      if (!stateConsent) {
        throw new Error('Missing state consent');
      }
      await expect(consents.revoke(stateConsent.id, foreign.founderId)).rejects.toMatchObject({
        status: 404,
      });
      const ready = await registrations.review(draft.id, foreign.founderId);
      expect(ready.ready).toBe(true);
      const restricted = await drafts.save(draft.id, foreign.founderId, {
        version: draft.version,
        title: draft.title,
        step: draft.step,
        configuration: {
          ...draft.configuration,
          allocations: [
            {
              owner: { type: 'PLAYER', id: foreign.founderId },
              shares: draft.configuration.totalShares,
            },
          ],
        },
      });
      await expect(registrations.review(restricted.id, foreign.founderId)).rejects.toMatchObject({
        code: 'FOREIGN_FOUNDER_RESTRICTED',
      });
      const restored = await drafts.save(restricted.id, foreign.founderId, {
        version: restricted.version,
        title: draft.title,
        step: draft.step,
        configuration: draft.configuration,
      });
      await directives.create(home.stateId, homeActor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'SET_COMPANY_REGISTRATION_POLICY',
          baseRevisionId: ready.policyRevisionId,
          policy: {
            ...freeCompanyPolicy,
            foreignPlayerFounders: 'DENY',
            stateFounders: 'DOMESTIC_ONLY',
          },
        },
      });
      await expect(registrations.review(restored.id, foreign.founderId)).rejects.toMatchObject({
        code: 'STATE_FOUNDER_RESTRICTED',
      });
      await expect(
        registrations.submit(restored.id, foreign.founderId, {
          version: restored.version,
          formationHash: restored.formationHash,
          policyRevisionId: ready.policyRevisionId,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'STATE_FOUNDER_RESTRICTED' });
      expect(
        (await db.select().from(companies).where(eq(companies.id, draft.companyId)))[0]?.status,
      ).toBe('DRAFT');
      expect(await db.select().from(companyShareBalances)).toHaveLength(0);
      const [restrictedPolicy] = await db
        .select()
        .from(companyRegistrationPolicyRevisions)
        .where(eq(companyRegistrationPolicyRevisions.stateId, home.stateId))
        .orderBy(desc(companyRegistrationPolicyRevisions.number))
        .limit(1);
      if (!restrictedPolicy) {
        throw new Error('Missing restricted policy');
      }
      await directives.create(home.stateId, homeActor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'SET_COMPANY_REGISTRATION_POLICY',
          baseRevisionId: restrictedPolicy.id,
          policy: { ...freeCompanyPolicy, foreignPlayerFounders: 'DENY' },
        },
      });
      const finalReview = await registrations.review(restored.id, foreign.founderId);
      expect(finalReview.ready).toBe(true);
      await registrations.submit(restored.id, foreign.founderId, {
        version: restored.version,
        formationHash: restored.formationHash,
        policyRevisionId: finalReview.policyRevisionId,
        idempotencyKey: crypto.randomUUID(),
      });
      expect(
        (await db.select().from(companies).where(eq(companies.id, draft.companyId)))[0],
      ).toMatchObject({ status: 'ACTIVE', issuedShares: '900719925474099312345678901234' });
      expect(await db.select().from(companyShareBalances)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ subjectId: home.founderId, shares: '1' }),
          expect.objectContaining({
            subjectId: foreign.stateId,
            shares: '900719925474099312345678901233',
          }),
        ]),
      );
      expect(await db.select().from(companyOfficeHolders)).toHaveLength(0);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
