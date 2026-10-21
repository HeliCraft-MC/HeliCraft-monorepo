// oxlint-disable import/max-dependencies -- Registration composes real state Governance, foreign applicants, immutable consents and PostgreSQL ownership.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import {
  companies,
  companyRegistrationApplications,
  companyRegistrationPolicyRevisions,
  companyShareBalances,
  companyShareEvents,
  companyOfficeHolders,
  companyRevisions,
  companyDrafts,
  companyStatusHistory,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyConsentService } from '../src/modules/companies/consents';
import { CompanyRegistrationService } from '../src/modules/companies/registration';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import { officeCompanyConfiguration, freeCompanyPolicy as freePolicy } from './companies-fixture';
// oxlint-disable-next-line max-lines-per-function -- Suite retains the complete first registration lifecycle on disposable persistence.
describe('company registration through state Governance', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- A foreign applicant, consents, exact initial shares and state review share one immutable history.
  it('requires an explicit policy and personal consents, activates free registration and approves a foreign application without granting citizenship', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const state = await monetaryFixture(db, 'Co');
      const foreign = await monetaryFixture(db, 'Fo');
      await addEconomicAuthority(db, state);
      const drafts = new CompanyDraftService(db);
      const consents = new CompanyConsentService(db);
      const registrations = new CompanyRegistrationService(db);
      const directives = new MonetaryDirectiveService(db);
      const actorId = foreign.founderId;
      const actor = { id: state.founderId, admin: false };
      const initial = await drafts.create(actorId, 'First company');
      const configuration = officeCompanyConfiguration(actorId, state.stateId);
      const draft = await drafts.save(initial.id, actorId, {
        version: initial.version,
        title: initial.title,
        step: 5,
        configuration,
      });
      await expect(drafts.get(draft.id, state.citizenId)).rejects.toThrow('не найден');
      await expect(registrations.review(draft.id, actorId)).rejects.toThrow('не утвердило');
      await directives.create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'SET_COMPANY_REGISTRATION_POLICY',
          baseRevisionId: null,
          policy: freePolicy,
        },
      });
      expect((await registrations.review(draft.id, actorId)).ready).toBe(false);
      await consents.grant(draft.id, actorId, {
        role: 'FOUNDER',
        formationHash: draft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      });
      const officerKey = crypto.randomUUID();
      const officer = await consents.grant(draft.id, actorId, {
        role: 'OFFICE_HOLDER',
        formationHash: draft.formationHash,
        idempotencyKey: officerKey,
      });
      expect(
        await consents.grant(draft.id, actorId, {
          role: 'OFFICE_HOLDER',
          formationHash: draft.formationHash,
          idempotencyKey: officerKey,
        }),
      ).toBe(officer);
      const review = await registrations.review(draft.id, actorId);
      expect(review.ready).toBe(true);
      const command = {
        version: draft.version,
        formationHash: draft.formationHash,
        policyRevisionId: review.policyRevisionId,
        idempotencyKey: crypto.randomUUID(),
      };
      const applications = await Promise.all([
        registrations.submit(draft.id, actorId, command),
        registrations.submit(draft.id, actorId, command),
      ]);
      expect(applications[0]).toBe(applications[1]);
      const [company] = await db.select().from(companies).where(eq(companies.id, draft.companyId));
      expect(company?.status).toBe('ACTIVE');
      expect(company?.issuedShares).toBe('37');
      expect(await db.select().from(companyShareEvents)).toHaveLength(1);
      expect(await db.select().from(companyShareBalances)).toMatchObject([
        { companyId: draft.companyId, subjectId: actorId, shares: '37' },
      ]);
      expect(await db.select().from(companyOfficeHolders)).toHaveLength(1);
      const [policy] = await db.select().from(companyRegistrationPolicyRevisions);
      if (!policy) {
        throw new Error('Policy missing');
      }
      await expect(
        db
          .update(companyRegistrationPolicyRevisions)
          .set({ number: 99 })
          .where(eq(companyRegistrationPolicyRevisions.id, policy.id)),
      ).rejects.toThrow();
      await expect(
        db.update(companies).set({ issuedShares: '38' }).where(eq(companies.id, draft.companyId)),
      ).rejects.toThrow();
      await expect(
        db
          .update(companyShareBalances)
          .set({ shares: '38' })
          .where(eq(companyShareBalances.companyId, draft.companyId)),
      ).rejects.toThrow();
      await expect(db.delete(companies).where(eq(companies.id, draft.companyId))).rejects.toThrow();
      await expect(
        db.insert(companyStatusHistory).values({
          companyId: draft.companyId,
          previousStatus: 'ACTIVE',
          status: 'SUSPENDED',
          actorId,
          reason: 'Forged status without changing the legal company',
        }),
      ).rejects.toThrow();
      await expect(consents.revoke(officer, actorId)).rejects.toThrow('Регистрация завершена');
      await directives.create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'SET_COMPANY_REGISTRATION_POLICY',
          baseRevisionId: policy.id,
          policy: { ...freePolicy, companyMode: 'APPROVAL' },
        },
      });
      const pending = await drafts.create(actorId, 'Reviewed company');
      const pendingDraft = await drafts.save(pending.id, actorId, {
        version: pending.version,
        title: pending.title,
        step: 5,
        configuration: officeCompanyConfiguration(actorId, state.stateId),
      });
      const founderConsent = await consents.grant(pendingDraft.id, actorId, {
        role: 'FOUNDER',
        formationHash: pendingDraft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      });
      await consents.grant(pendingDraft.id, actorId, {
        role: 'OFFICE_HOLDER',
        formationHash: pendingDraft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      });
      const pendingReview = await registrations.review(pendingDraft.id, actorId);
      const applicationId = await registrations.submit(pendingDraft.id, actorId, {
        version: pendingDraft.version,
        formationHash: pendingDraft.formationHash,
        policyRevisionId: pendingReview.policyRevisionId,
        idempotencyKey: crypto.randomUUID(),
      });
      expect(
        (await db.select().from(companies).where(eq(companies.id, pendingDraft.companyId)))[0]
          ?.status,
      ).toBe('PENDING_REGISTRATION');
      await expect(
        directives.create(
          state.stateId,
          { id: actorId, admin: false },
          {
            idempotencyKey: crypto.randomUUID(),
            payload: {
              kind: 'REVIEW_COMPANY_REGISTRATION',
              applicationId,
              formationHash: pendingDraft.formationHash,
              decision: 'APPROVE',
              reason: 'Foreign applicant is permitted',
            },
          },
        ),
      ).rejects.toMatchObject({ status: 404, code: 'STATE_NOT_FOUND' });
      await consents.revoke(founderConsent, actorId);
      await expect(
        directives.create(state.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'REVIEW_COMPANY_REGISTRATION',
            applicationId,
            formationHash: pendingDraft.formationHash,
            decision: 'APPROVE',
            reason: 'Must retain current consents',
          },
        }),
      ).rejects.toThrow('согласие');
      await consents.grant(pendingDraft.id, actorId, {
        role: 'FOUNDER',
        formationHash: pendingDraft.formationHash,
        idempotencyKey: crypto.randomUUID(),
      });
      await directives.create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'REVIEW_COMPANY_REGISTRATION',
          applicationId,
          formationHash: pendingDraft.formationHash,
          decision: 'APPROVE',
          reason: 'Exact company charter and ownership approved',
        },
      });
      expect(
        (await db.select().from(companies).where(eq(companies.id, pendingDraft.companyId)))[0]
          ?.status,
      ).toBe('ACTIVE');
      expect(await db.select().from(companyRegistrationApplications)).toHaveLength(2);
      expect(await db.select().from(companyRevisions)).toHaveLength(2);
      expect(
        (await db.select().from(companyDrafts).where(eq(companyDrafts.id, pendingDraft.id)))[0]
          ?.submittedApplicationId,
      ).toBe(applicationId);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
