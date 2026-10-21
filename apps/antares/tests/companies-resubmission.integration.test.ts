// oxlint-disable import/max-dependencies -- Registration rollback and resubmission exercise real Governance, ledger, normalized revisions and immutable application evidence.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import {
  companies,
  companyDrafts,
  companyRegistrationApplications,
  companyRegistrationPolicyRevisions,
  companyRevisions,
  companyShareBalances,
  companyStatusHistory,
  financialAccounts,
  ledgerTransactions,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyConsentService } from '../src/modules/companies/consents';
import { CompanyRegistrationService } from '../src/modules/companies/registration';
import type { CompanyDraft } from '../src/modules/companies/registration-contracts';
import type { CompanyRegistrationPolicy } from '../src/modules/companies/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishMoney } from './taxation-fixture';
import { freeCompanyPolicy, officeCompanyConfiguration } from './companies-fixture';

async function consentToFormation(
  service: CompanyConsentService,
  draft: CompanyDraft,
  actorId: string,
): Promise<void> {
  await service.grant(draft.id, actorId, {
    role: 'FOUNDER',
    formationHash: draft.formationHash,
    idempotencyKey: crypto.randomUUID(),
  });
  await service.grant(draft.id, actorId, {
    role: 'OFFICE_HOLDER',
    formationHash: draft.formationHash,
    idempotencyKey: crypto.randomUUID(),
  });
}
// oxlint-disable-next-line max-lines-per-function -- The suite retains the complete paid application and resubmission lifecycle on disposable persistence.
describe('company application fees and resubmission', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- The scenario proves rollback before payment and retains both paid applications through refusal, revision and final activation.
  it('rolls back an unfunded submission and preserves paid rejected history when the same legal company reapplies', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const state = await monetaryFixture(db, 'Re');
      await addEconomicAuthority(db, state);
      const currencyId = await establishMoney(db, state);
      const actor = { id: state.founderId, admin: false };
      const directives = new MonetaryDirectiveService(db);
      const drafts = new CompanyDraftService(db);
      const consents = new CompanyConsentService(db);
      const registrations = new CompanyRegistrationService(db);
      const setPolicy = async (
        baseRevisionId: string | null,
        amountMinor: string,
      ): Promise<void> => {
        const policy: CompanyRegistrationPolicy = {
          ...freeCompanyPolicy,
          companyMode: 'APPROVAL',
          registrationFee: { currencyId, amountMinor },
        };
        await directives.create(state.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: { kind: 'SET_COMPANY_REGISTRATION_POLICY', baseRevisionId, policy },
        });
      };
      await setPolicy(null, '600000');
      const initial = await drafts.create(actor.id, 'Paid application');
      const draft = await drafts.save(initial.id, actor.id, {
        version: initial.version,
        title: initial.title,
        step: 5,
        configuration: officeCompanyConfiguration(actor.id, state.stateId),
      });
      await consentToFormation(consents, draft, actor.id);
      const insufficient = await registrations.review(draft.id, actor.id);
      expect(insufficient).toMatchObject({
        ready: false,
        problem: 'Недостаточно средств для регистрационного сбора',
      });
      const journalCount = (await db.select().from(ledgerTransactions)).length;
      const key = crypto.randomUUID();
      await expect(
        registrations.submit(draft.id, actor.id, {
          version: draft.version,
          formationHash: draft.formationHash,
          policyRevisionId: insufficient.policyRevisionId,
          idempotencyKey: key,
        }),
      ).rejects.toThrow('Недостаточно средств');
      expect(await db.select().from(companyRevisions)).toHaveLength(0);
      expect(await db.select().from(companyRegistrationApplications)).toHaveLength(0);
      expect(await db.select().from(ledgerTransactions)).toHaveLength(journalCount);
      expect(await drafts.get(draft.id, actor.id)).toMatchObject({
        version: draft.version,
        submittedApplicationId: null,
      });
      await setPolicy(insufficient.policyRevisionId, '250000');
      const review = await registrations.review(draft.id, actor.id);
      await expect(
        registrations.submit(draft.id, actor.id, {
          version: draft.version,
          formationHash: draft.formationHash,
          policyRevisionId: insufficient.policyRevisionId,
          idempotencyKey: key,
        }),
      ).rejects.toMatchObject({ code: 'COMPANY_REGISTRATION_POLICY_STALE' });
      const firstId = await registrations.submit(draft.id, actor.id, {
        version: draft.version,
        formationHash: draft.formationHash,
        policyRevisionId: review.policyRevisionId,
        idempotencyKey: key,
      });
      const [first] = await db
        .select()
        .from(companyRegistrationApplications)
        .where(eq(companyRegistrationApplications.id, firstId));
      expect(first?.feeJournalId).toEqual(expect.any(String));
      await directives.create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'REVIEW_COMPANY_REGISTRATION',
          applicationId: firstId,
          formationHash: draft.formationHash,
          decision: 'REJECT',
          reason: 'Clarify the public company profile',
        },
      });
      await expect(
        drafts.save(draft.id, actor.id, {
          version: draft.version + 1,
          title: 'Overwrite rejected evidence',
          step: 0,
          configuration: draft.configuration,
        }),
      ).rejects.toMatchObject({ code: 'COMPANY_DRAFT_CONFLICT' });
      await expect(drafts.reopen(draft.id, state.citizenId)).rejects.toMatchObject({ status: 404 });
      const reopened = await drafts.reopen(draft.id, actor.id);
      expect(reopened.companyId).toBe(draft.companyId);
      expect(reopened.id).not.toBe(draft.id);
      expect((await drafts.reopen(draft.id, actor.id)).id).toBe(reopened.id);
      const revised = await drafts.save(reopened.id, actor.id, {
        version: reopened.version,
        title: 'Clarified application',
        step: 5,
        configuration: {
          ...reopened.configuration,
          name: { en: 'Clarified universal company', ru: 'Уточнённая компания' },
        },
      });
      expect((await registrations.review(revised.id, actor.id)).ready).toBe(false);
      await expect(
        consents.grant(revised.id, actor.id, {
          role: 'FOUNDER',
          formationHash: draft.formationHash,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'FORMATION_STALE' });
      await consentToFormation(consents, revised, actor.id);
      const secondReview = await registrations.review(revised.id, actor.id);
      const secondId = await registrations.submit(revised.id, actor.id, {
        version: revised.version,
        formationHash: revised.formationHash,
        policyRevisionId: secondReview.policyRevisionId,
        idempotencyKey: crypto.randomUUID(),
      });
      await directives.create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'REVIEW_COMPANY_REGISTRATION',
          applicationId: secondId,
          formationHash: revised.formationHash,
          decision: 'APPROVE',
          reason: 'Revised profile approved',
        },
      });
      const [company] = await db.select().from(companies).where(eq(companies.id, draft.companyId));
      expect(company).toMatchObject({
        status: 'ACTIVE',
        currentApplicationId: secondId,
        issuedShares: '37',
      });
      expect(await db.select().from(companyShareBalances)).toMatchObject([
        { companyId: draft.companyId, shares: '37' },
      ]);
      expect(await db.select().from(companyRevisions)).toHaveLength(2);
      expect(await db.select().from(companyDrafts)).toHaveLength(2);
      expect(await db.select().from(companyStatusHistory)).toHaveLength(4);
      expect(await db.select().from(companyRegistrationPolicyRevisions)).toHaveLength(2);
      expect(
        (
          await db
            .select()
            .from(companyRegistrationApplications)
            .where(eq(companyRegistrationApplications.id, firstId))
        )[0],
      ).toMatchObject({
        status: 'REJECTED',
        feeJournalId: first?.feeJournalId,
        formationHash: draft.formationHash,
      });
      const balances = await db
        .select()
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.currencyId, currencyId),
            eq(financialAccounts.kind, 'PLAYER'),
            eq(financialAccounts.ownerId, actor.id),
          ),
        );
      expect(balances[0]?.balanceMinor).toBe('0');
      expect(await db.select().from(ledgerTransactions)).toHaveLength(journalCount + 2);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
