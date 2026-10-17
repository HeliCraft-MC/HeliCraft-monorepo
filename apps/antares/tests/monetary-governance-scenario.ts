// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Fixed fixture counts and awaited evidence assertions inspect real PostgreSQL results.
// oxlint-disable max-lines-per-function, max-statements -- One persisted decision lifecycle exercises conjunctive office approvals, frozen votes and revocation.
// oxlint-disable import/max-dependencies -- Integration exercises existing governance and voting services directly.
import { and, eq, isNull, sql } from 'drizzle-orm';
import { expect } from 'vitest';
import type { Database } from '../src/db';
import { votings, stateOfficeHolders, votingEligibleVoters } from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { StateReformService } from '../src/modules/states/reforms';
import { StateService } from '../src/modules/states/service';
import { VotingService } from '../src/modules/voting/service';
import type { DirectivePayload } from '../src/modules/monetary/contracts';

async function assertPolicyStaleness(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; adminId: string }>,
): Promise<void> {
  const states = new StateService(db);
  const current = await states.detail(fixture.stateId, 'en');
  const configuration = structuredClone(current.configuration);
  configuration.governance.policies = configuration.governance.policies.map((policy) =>
    policy.action === 'ISSUE_CURRENCY'
      ? {
          ...policy,
          mechanism: 'MANUAL',
          officeIds: [],
          manualProcedure: { en: 'Review issuance evidence' },
        }
      : policy,
  );
  await new StateReformService(db).adminOverride(
    {
      stateId: fixture.stateId,
      baseRevisionId: current.governanceRevisionId,
      configuration,
      reason: 'Policy revision pinning fixture',
    },
    fixture.adminId,
  );
  const actor = { id: fixture.founderId, admin: false };
  const money = await new MonetaryService(db).state(fixture.stateId, actor);
  if (!money.currency || !money.currency.policy) {
    throw new Error('Missing policy fixture');
  }
  const directives = new MonetaryDirectiveService(db);
  const id = await directives.create(fixture.stateId, actor, {
    idempotencyKey: crypto.randomUUID(),
    payload: {
      kind: 'ISSUE',
      currencyId: money.currency.id,
      amountMinor: '1',
      purpose: 'Pinned monetary policy',
    },
  });
  await directives.create(fixture.stateId, actor, {
    idempotencyKey: crypto.randomUUID(),
    payload: {
      kind: 'CHANGE_POLICY',
      currencyId: money.currency.id,
      policy: money.currency.policy.limits,
    },
  });
  expect((await directives.detail(id, actor)).stale).toBe(true);
  await expect(
    directives.apply(id, { id: fixture.adminId, admin: true }, 'Old policy must not execute'),
  ).rejects.toThrow('согласование');
  await directives.cancel(id, actor);
  const latest = await states.detail(fixture.stateId, 'en');
  await new StateReformService(db).adminOverride(
    {
      stateId: fixture.stateId,
      baseRevisionId: latest.governanceRevisionId,
      configuration: current.configuration,
      reason: 'Restore single office fixture',
    },
    fixture.adminId,
  );
}
async function assertMonetaryGovernance(
  db: Database['db'],
  fixture: Readonly<{
    stateId: string;
    founderId: string;
    citizenId: string;
    adminId: string;
    officeId: string;
  }>,
): Promise<void> {
  const states = new StateService(db);
  const reforms = new StateReformService(db);
  const current = await states.detail(fixture.stateId, 'en');
  const configuration = structuredClone(current.configuration);
  const [office] = configuration.governance.offices;
  if (!office) {
    throw new Error('Missing office');
  }
  const secondId = crypto.randomUUID();
  configuration.governance.offices.push({
    ...office,
    id: secondId,
    name: { en: 'Auditor' },
    term: 'FIXED_TERM',
    termDays: 1,
    initialHolderIds: [fixture.citizenId],
    required: false,
  });
  configuration.governance.policies = configuration.governance.policies.map((policy) =>
    policy.action === 'CHANGE_BANK_CHARTER'
      ? {
          ...policy,
          mechanism: 'COMBINED',
          officeIds: [office.id, secondId],
          vote: { ...configuration.governance.votingDefaults, thresholdKind: 'SIMPLE_MAJORITY' },
        }
      : policy,
  );
  await reforms.adminOverride(
    {
      stateId: fixture.stateId,
      baseRevisionId: current.governanceRevisionId,
      configuration,
      reason: 'Combined governance fixture',
    },
    fixture.adminId,
  );
  const directives = new MonetaryDirectiveService(db);
  const founder = { id: fixture.founderId, admin: false };
  const citizen = { id: fixture.citizenId, admin: false };
  const admin = { id: fixture.adminId, admin: true };
  const charter: DirectivePayload = {
    kind: 'CHANGE_CHARTER',
    name: { en: 'Reviewed bank', ru: 'Проверенный банк' },
    description: { en: 'Approved by two offices and citizens' },
  };
  const id = await directives.create(fixture.stateId, founder, {
    idempotencyKey: crypto.randomUUID(),
    payload: charter,
  });
  const details = await directives.detail(id, founder);
  expect(details.status).toBe('PENDING');
  expect(details.approvalGroups[0]?.officeIds).toHaveLength(2);
  const [vote] = details.votes;
  if (!vote) {
    throw new Error('Missing generic vote');
  }
  expect(
    await db.select().from(votingEligibleVoters).where(eq(votingEligibleVoters.votingId, vote.id)),
  ).toHaveLength(2);
  await expect(directives.apply(id, admin, 'Admin cannot replace citizen vote')).rejects.toThrow(
    'Требуются',
  );
  await directives.approve(id, founder, office.id);
  await directives.approve(id, citizen, secondId);
  await directives.revoke(id, citizen, secondId);
  expect(
    (await directives.detail(id, founder)).approvals.some(
      (approval) => approval.officeId === secondId,
    ),
  ).toBe(false);
  await directives.approve(id, citizen, secondId);
  await expect(directives.apply(id, founder)).rejects.toThrow('Требуются');
  const voting = new VotingService(db);
  const input = await voting.detail(vote.id, fixture.founderId, false);
  const [yes] = input.input.options;
  if (!yes) {
    throw new Error('Missing approval option');
  }
  await voting.cast(vote.id, fixture.founderId, { choices: [yes.id], abstain: false });
  await voting.cast(vote.id, fixture.citizenId, { choices: [yes.id], abstain: false });
  await db
    .update(votings)
    .set({
      opensAt: sql`clock_timestamp() - interval '2 seconds'`,
      closesAt: sql`clock_timestamp() - interval '1 second'`,
    })
    .where(eq(votings.id, vote.id));
  expect((await directives.detail(id, founder)).ready).toBe(true);
  await db
    .update(stateOfficeHolders)
    .set({ since: sql`clock_timestamp() - interval '2 days'` })
    .where(and(eq(stateOfficeHolders.officeId, secondId), isNull(stateOfficeHolders.until)));
  expect(
    (await directives.detail(id, founder)).approvals.find(
      (approval) => approval.officeId === secondId,
    )?.current,
  ).toBe(false);
  await expect(directives.apply(id, founder)).rejects.toThrow('Требуются');
  await db.transaction(async (transaction) => {
    await transaction
      .update(stateOfficeHolders)
      .set({ until: sql`clock_timestamp()` })
      .where(and(eq(stateOfficeHolders.officeId, secondId), isNull(stateOfficeHolders.until)));
    await transaction
      .insert(stateOfficeHolders)
      .values({ officeId: secondId, userId: fixture.citizenId, since: sql`clock_timestamp()` });
  });
  expect(
    (await directives.detail(id, founder)).approvals.find(
      (approval) => approval.officeId === secondId,
    )?.current,
  ).toBe(false);
  await expect(directives.apply(id, founder)).rejects.toThrow('Требуются');
  await directives.approve(id, citizen, secondId);
  await Promise.all([directives.apply(id, founder), directives.apply(id, founder)]);
  expect((await new MonetaryService(db).state(fixture.stateId, founder)).bank?.name.en).toBe(
    'Reviewed bank',
  );
  const interruptedId = await directives.create(fixture.stateId, founder, {
    idempotencyKey: crypto.randomUUID(),
    payload: charter,
  });
  await db.transaction(async (transaction) => {
    await transaction
      .update(stateOfficeHolders)
      .set({ until: sql`clock_timestamp()` })
      .where(and(eq(stateOfficeHolders.officeId, office.id), isNull(stateOfficeHolders.until)));
    await transaction
      .insert(stateOfficeHolders)
      .values({ officeId: office.id, userId: fixture.founderId, since: sql`clock_timestamp()` });
  });
  expect((await directives.detail(interruptedId, founder)).stale).toBe(true);
  await directives.cancel(interruptedId, founder);
  const staleId = await directives.create(fixture.stateId, founder, {
    idempotencyKey: crypto.randomUUID(),
    payload: charter,
  });
  const latest = await states.detail(fixture.stateId, 'en');
  await reforms.adminOverride(
    {
      stateId: fixture.stateId,
      baseRevisionId: latest.governanceRevisionId,
      configuration: { ...latest.configuration, description: { en: 'New revision' } },
      reason: 'Revision staleness fixture',
    },
    fixture.adminId,
  );
  expect((await directives.detail(staleId, founder)).stale).toBe(true);
  await expect(directives.apply(staleId, founder)).rejects.toThrow('согласование');
  await directives.cancel(staleId, founder);
  const manual = await states.detail(fixture.stateId, 'en');
  const manualConfiguration = structuredClone(manual.configuration);
  manualConfiguration.governance.policies = manualConfiguration.governance.policies.map((policy) =>
    policy.action === 'CHANGE_BANK_CHARTER'
      ? {
          ...policy,
          mechanism: 'MANUAL',
          officeIds: [],
          manualProcedure: { en: 'Administrative review of documented state evidence' },
        }
      : policy,
  );
  await reforms.adminOverride(
    {
      stateId: fixture.stateId,
      baseRevisionId: manual.governanceRevisionId,
      configuration: manualConfiguration,
      reason: 'Manual procedure fixture',
    },
    fixture.adminId,
  );
  const manualId = await directives.create(fixture.stateId, founder, {
    idempotencyKey: crypto.randomUUID(),
    payload: { ...charter, name: { en: 'Manual charter' } },
  });
  await expect(directives.apply(manualId, founder, 'Not an admin')).rejects.toThrow('Требуются');
  await expect(directives.apply(manualId, admin)).rejects.toThrow('Требуются');
  await directives.apply(
    manualId,
    admin,
    'Evidence reviewed under the configured manual procedure',
  );
  await assertPolicyStaleness(db, fixture);
  const { bank } = await new MonetaryService(db).state(fixture.stateId, founder);
  expect(bank?.name.en).toBe('Manual charter');
  if (!bank) {
    throw new Error('Bank missing');
  }
  expect(
    (await new BankModerationService(db).list(fixture.adminId)).find((item) => item.id === bank.id)
      ?.reviews.length,
  ).toBeGreaterThan(0);
}

export { assertMonetaryGovernance };
