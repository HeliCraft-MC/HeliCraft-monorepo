// oxlint-disable import/max-dependencies -- Corporate authorization, exact frozen ownership and entity ballots exercise the real domain services and PostgreSQL constraints.
// oxlint-disable max-lines -- Independent corporate office, weighted ownership and legal-entity ballot scenarios share one disposable database fixture.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  companies,
  companyOfficeHolders,
  companyDecisions,
  votingBallots,
  votingEligibleVoters,
  votings,
} from '../src/db/schema';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import {
  freeCompanyPolicy,
  officeCompanyConfiguration,
  prepareCompany,
  submitPreparedCompany,
} from './companies-fixture';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { companyActor } from '../src/modules/companies/store';
import { readCompanyRevision } from '../src/modules/companies/revisions';
import { VotingService } from '../src/modules/voting/service';
import {
  advance,
  lockedVoting,
  persistVoting,
  publishVoting,
} from '../src/modules/voting/persistence';
import { ShareOperationService } from '../src/modules/companies/share-operations';
import { ShareConsentService } from '../src/modules/companies/share-consents';
import { PersonalShareService } from '../src/modules/companies/share-settlement';
import type { ShareTransfer } from '../src/modules/companies/ownership-contracts';
import { currentShareholderParticipant } from '../src/modules/companies/shareholder-access';
import { listCompanyWorkspaces } from '../src/modules/companies/workspace-directory';
import { stateRecord } from '../src/modules/states/persistence';
import { emptyConfiguration } from '../src/modules/states/domain';

let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
let state: Awaited<ReturnType<typeof monetaryFixture>> | null = null;
function context(): { db: Database['db']; fixture: Awaited<ReturnType<typeof monetaryFixture>> } {
  if (!database || !state) {
    throw new Error('Corporate fixture unavailable');
  }
  return { db: database.db, fixture: state };
}
async function assertWorkspaceDirectory(
  db: Database['db'],
  input: Readonly<{
    actor: { id: string; admin: boolean };
    parentId: string;
    disposedId: string;
    decisionId: string;
  }>,
): Promise<void> {
  const shareholder = await db.transaction(
    async (transaction) =>
      await currentShareholderParticipant(transaction, input.disposedId, input.actor.id),
  );
  expect(shareholder).toBe(false);
  const accessible = await listCompanyWorkspaces(db, input.actor, 1);
  expect(accessible.items.map((company) => company.id)).toContain(input.parentId);
  expect(accessible.items.map((company) => company.id)).not.toContain(input.disposedId);
  const proof = await new CompanyDecisionService(db).proof(input.decisionId, input.actor);
  expect(proof.stale).toBe(false);
}
async function revisionId(companyId: string): Promise<string> {
  const { db } = context();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (company?.currentRevisionId === undefined || company.currentRevisionId === null) {
    throw new Error('Active charter missing');
  }
  return company.currentRevisionId;
}
async function closeVote(votingId: string): Promise<void> {
  await context().db.transaction(async (transaction) => {
    const record = await lockedVoting(transaction, votingId);
    await advance(transaction, record, new Date(record.closesAt.getTime() + 1));
  });
}
function gate(): { wait: Promise<void>; open: () => void } {
  let release: (() => void) | null = null;
  // oxlint-disable-next-line promise/avoid-new -- Explicit gates establish the two real PostgreSQL lock owners without timing sleeps.
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait,
    open: () => {
      if (release === null) {
        throw new Error('Gate not initialized');
      }
      release();
    },
  };
}
async function assertStateVotingLockOrder(
  db: Database['db'],
  input: Readonly<{ stateId: string; companyId: string; actorId: string }>,
): Promise<void> {
  const stateLocked = gate();
  const corporateLocked = gate();
  const results = await Promise.allSettled([
    db.transaction(async (transaction) => {
      try {
        await transaction.execute(sql`set local lock_timeout = '5s'`);
        await stateRecord(transaction, input.stateId);
        stateLocked.open();
        await corporateLocked.wait;
        const now = new Date();
        const id = await persistVoting(transaction, input.actorId, {
          title: { en: 'State locking regression' },
          description: {},
          options: [
            { id: crypto.randomUUID(), label: { en: 'Approve' } },
            { id: crypto.randomUUID(), label: { en: 'Reject' } },
          ],
          opensAt: now.toISOString(),
          closesAt: new Date(now.getTime() + 3_600_000).toISOString(),
          electorate: { type: 'STATE_CITIZENS', stateId: input.stateId },
          rules: emptyConfiguration().governance.votingDefaults,
          maxSelections: 1,
          resultVisibility: 'ELIGIBLE_ONLY',
        });
        await publishVoting(transaction, id);
      } finally {
        stateLocked.open();
      }
    }),
    db.transaction(async (transaction) => {
      await stateLocked.wait;
      try {
        await transaction.execute(sql`set local lock_timeout = '5s'`);
        await companyActor(transaction, input.actorId);
        corporateLocked.open();
        expect(
          await currentShareholderParticipant(transaction, input.companyId, input.actorId),
        ).toBe(true);
      } finally {
        corporateLocked.open();
      }
    }),
  ]);
  for (const result of results) {
    expect(result).toMatchObject({ status: 'fulfilled' });
  }
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  state = await monetaryFixture(database.db, 'Cg');
  await addEconomicAuthority(database.db, state);
  await new MonetaryDirectiveService(database.db).create(
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
});
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Separate scenarios retain their full immutable company histories in one disposable shared persistence fixture.
describe('corporate Governance and generic Voting', () => {
  // oxlint-disable-next-line max-lines-per-function -- One two-office decision proves revocation, uninterrupted appointments, reappointment, exact revision pinning and preserved approved payloads.
  it('requires real current office signatures and never revives a signature after reappointment', async () => {
    const { db, fixture } = context();
    const actor = { id: fixture.founderId, admin: false };
    const officer = { id: fixture.citizenId, admin: false };
    const configuration = officeCompanyConfiguration(actor.id, fixture.stateId);
    const [first] = configuration.charter.offices;
    if (!first) {
      throw new Error('First office missing');
    }
    const second = {
      ...first,
      id: crypto.randomUUID(),
      name: { en: 'Independent approver' },
      initialHolderIds: [officer.id],
    };
    configuration.charter.offices.push(second);
    configuration.charter.policies = configuration.charter.policies.map((policy) =>
      policy.action === 'UPDATE_PROFILE'
        ? {
            ...policy,
            procedure: {
              ...policy.procedure,
              mechanism: 'MULTIPLE_OFFICES',
              officeIds: [first.id, second.id],
            },
          }
        : policy,
    );
    const draft = await prepareCompany(db, { applicantId: actor.id, configuration });
    await submitPreparedCompany(db, draft);
    const pinned = await revisionId(draft.companyId);
    const decisions = new CompanyDecisionService(db);
    const command = {
      revisionId: pinned,
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'UPDATE_PROFILE' as const,
        name: { en: 'Jointly approved', ru: 'Совместно одобрено' },
        description: { en: 'Exact signed profile' },
        categories: ['descriptive'],
      },
    };
    const id = await decisions.create(draft.companyId, actor, command);
    expect(await decisions.create(draft.companyId, actor, command)).toBe(id);
    await expect(
      decisions.create(draft.companyId, actor, {
        ...command,
        payload: { ...command.payload, name: { en: 'Different' } },
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect((await decisions.proof(id, actor)).ready).toBe(false);
    await expect(decisions.apply(id, actor)).rejects.toMatchObject({
      code: 'COMPANY_DECISION_NOT_APPROVED',
    });
    await decisions.approve(id, officer, second.id);
    const signed = await decisions.proof(id, actor);
    const signature = signed.approvals.find(
      (approval) => approval.actorId === officer.id && approval.current,
    );
    if (!signature) {
      throw new Error('Office signature missing');
    }
    expect(signed.ready).toBe(true);
    await decisions.revoke(id, officer, signature.id);
    expect((await decisions.proof(id, actor)).ready).toBe(false);
    await decisions.approve(id, officer, second.id);
    await decisions.create(draft.companyId, actor, {
      revisionId: pinned,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'REMOVE_OFFICE_HOLDER', officeId: second.id, userId: officer.id },
    });
    expect((await decisions.proof(id, actor)).ready).toBe(false);
    await decisions.create(draft.companyId, actor, {
      revisionId: pinned,
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'APPOINT_OFFICE_HOLDER',
        officeId: second.id,
        userId: officer.id,
        replacedUserId: null,
      },
    });
    expect(
      (await decisions.proof(id, actor)).approvals
        .filter((approval) => approval.actorId === officer.id)
        .every((approval) => !approval.current),
    ).toBe(true);
    await decisions.approve(id, officer, second.id);
    await decisions.apply(id, actor);
    const changed = await revisionId(draft.companyId);
    expect(changed).not.toBe(pinned);
    const content = await db.transaction(
      async (transaction) => await readCompanyRevision(transaction, changed),
    );
    expect(content.content.name).toEqual(command.payload.name);
    expect((await decisions.proof(id, actor)).payload).toEqual(command.payload);
    expect(
      await db
        .select()
        .from(companyOfficeHolders)
        .where(eq(companyOfficeHolders.officeId, second.id)),
    ).toHaveLength(2);
    await expect(
      decisions.create(draft.companyId, actor, { ...command, idempotencyKey: crypto.randomUUID() }),
    ).rejects.toMatchObject({ code: 'COMPANY_CHARTER_STALE' });
  });
  // oxlint-disable-next-line max-lines-per-function -- Exact large weights remain frozen while a real balanced ownership transfer changes the current shareholder graph.
  it('freezes large share weights and voter identities before a transfer and applies the actual weighted result', async () => {
    const { db, fixture } = context();
    const actor = { id: fixture.founderId, admin: false };
    const configuration = officeCompanyConfiguration(actor.id, fixture.stateId);
    configuration.totalShares = '18014398509481985';
    configuration.allocations = [
      { owner: { type: 'PLAYER', id: actor.id }, shares: '9007199254740993' },
      { owner: { type: 'PLAYER', id: fixture.citizenId }, shares: '9007199254740992' },
    ];
    configuration.charter.offices = [];
    configuration.charter.policies = [
      {
        action: 'UPDATE_PROFILE',
        procedure: {
          mechanism: 'SHAREHOLDER_VOTE',
          officeIds: [],
          vote: {
            ...configuration.charter.votingDefaults,
            thresholdKind: 'SIMPLE_MAJORITY',
            quorumPercent: 50,
            closeWhenDecided: false,
          },
          manualProcedure: {},
        },
        financialBands: [],
      },
    ];
    const draft = await prepareCompany(db, { applicantId: actor.id, configuration });
    await submitPreparedCompany(db, draft);
    const decisions = new CompanyDecisionService(db);
    const id = await decisions.create(draft.companyId, actor, {
      revisionId: await revisionId(draft.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'UPDATE_PROFILE',
        name: { en: 'Weighted result' },
        description: {},
        categories: [],
      },
    });
    const proof = await decisions.proof(id, actor);
    const [vote] = proof.votes;
    if (!vote) {
      throw new Error('Shareholder vote missing');
    }
    const voting = new VotingService(db);
    const detail = await voting.detail(vote.id, actor.id, false);
    const [yes, no] = detail.input.options;
    if (!yes || !no) {
      throw new Error('Ballot options missing');
    }
    const operation: ShareTransfer = {
      kind: 'TRANSFER',
      operationId: crypto.randomUUID(),
      issuerId: draft.companyId,
      issuerRevisionId: await revisionId(draft.companyId),
      owner: { type: 'PLAYER', id: actor.id },
      recipient: { type: 'PLAYER', id: fixture.adminId },
      shares: '9007199254740993',
    };
    const operations = new ShareOperationService(db);
    await operations.create(actor.id, { operation, idempotencyKey: crypto.randomUUID() });
    const terms = await operations.get(operation.operationId, actor.id);
    await new ShareConsentService(db).grant(fixture.adminId, {
      operationId: operation.operationId,
      termsHash: terms.termsHash,
      idempotencyKey: crypto.randomUUID(),
    });
    await new PersonalShareService(db).transfer(actor.id, {
      operation,
      authorizationDecisionId: null,
      idempotencyKey: crypto.randomUUID(),
    });
    await expect(
      voting.cast(vote.id, fixture.adminId, { choices: [yes.id], abstain: false }),
    ).rejects.toMatchObject({ code: 'VOTER_INELIGIBLE' });
    await voting.cast(vote.id, actor.id, { choices: [yes.id], abstain: false });
    await voting.cast(vote.id, fixture.citizenId, { choices: [no.id], abstain: false });
    await expect(
      voting.cast(vote.id, actor.id, { choices: [no.id], abstain: false }),
    ).rejects.toMatchObject({ code: 'VOTING_NOT_OPEN' });
    await expect(
      db
        .update(votingEligibleVoters)
        .set({ weight: '1' })
        .where(eq(votingEligibleVoters.votingId, vote.id)),
    ).rejects.toThrow();
    await expect(
      db.insert(votingEligibleVoters).values({
        votingId: vote.id,
        voterId: fixture.adminId,
        userId: fixture.adminId,
        weight: '1',
      }),
    ).rejects.toThrow();
    await expect(
      db.update(votings).set({ closesAt: new Date() }).where(eq(votings.id, vote.id)),
    ).rejects.toThrow();
    await closeVote(vote.id);
    expect((await voting.detail(vote.id, actor.id, false)).result).toMatchObject({
      weights: { eligible: '18014398509481985', participating: '18014398509481985' },
      options: [
        { id: yes.id, votes: 1, approved: true },
        { id: no.id, votes: 1, approved: false },
      ],
    });
    expect((await decisions.proof(id, actor)).ready).toBe(true);
    await decisions.apply(id, { id: fixture.citizenId, admin: false });
    expect((await decisions.proof(id, actor)).record.status).toBe('APPLIED');
  });
  // oxlint-disable-next-line max-lines-per-function -- A parent founds an independent company through its actual Governance and casts one legal-subject ballot through another immutable decision.
  it('founds a subsidiary and prevents different corporate representatives from voting the same shares twice', async () => {
    const { db, fixture } = context();
    const actor = { id: fixture.founderId, admin: false };
    const other = { id: fixture.citizenId, admin: false };
    const parentConfiguration = officeCompanyConfiguration(actor.id, fixture.stateId);
    const [parentOffice] = parentConfiguration.charter.offices;
    if (!parentOffice) {
      throw new Error('Parent office missing');
    }
    parentOffice.maxHolders = 2;
    parentOffice.initialHolderIds.push(other.id);
    const parent = await prepareCompany(db, {
      applicantId: actor.id,
      configuration: parentConfiguration,
    });
    await submitPreparedCompany(db, parent);
    const childConfiguration = officeCompanyConfiguration(actor.id, fixture.stateId);
    childConfiguration.allocations = [
      { owner: { type: 'COMPANY', id: parent.companyId }, shares: childConfiguration.totalShares },
    ];
    childConfiguration.charter.offices = [];
    childConfiguration.charter.policies = [
      {
        action: 'UPDATE_PROFILE',
        procedure: {
          mechanism: 'SHAREHOLDER_VOTE',
          officeIds: [],
          vote: null,
          manualProcedure: {},
        },
        financialBands: [],
      },
    ];
    const child = await prepareCompany(db, {
      applicantId: actor.id,
      configuration: childConfiguration,
    });
    const decisions = new CompanyDecisionService(db);
    await decisions.create(parent.companyId, actor, {
      revisionId: await revisionId(parent.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'FOUND_COMPANY',
        companyId: child.companyId,
        formationHash: child.formationHash,
      },
    });
    await submitPreparedCompany(db, child);
    const id = await decisions.create(child.companyId, other, {
      revisionId: await revisionId(child.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'UPDATE_PROFILE',
        name: { en: 'Independent subsidiary' },
        description: {},
        categories: [],
      },
    });
    const proof = await decisions.proof(id, actor);
    const [vote] = proof.votes;
    if (!vote) {
      throw new Error('Subsidiary shareholder vote missing');
    }
    const [record] = await db.select().from(votings).where(eq(votings.id, vote.id));
    const yes = record?.configuration.options[0];
    if (!yes) {
      throw new Error('Approval option missing');
    }
    const disposed: ShareTransfer = {
      kind: 'TRANSFER',
      operationId: crypto.randomUUID(),
      issuerId: child.companyId,
      issuerRevisionId: await revisionId(child.companyId),
      owner: { type: 'COMPANY', id: parent.companyId },
      recipient: { type: 'PLAYER', id: actor.id },
      shares: childConfiguration.totalShares,
    };
    const operations = new ShareOperationService(db);
    await operations.create(actor.id, {
      operation: disposed,
      idempotencyKey: crypto.randomUUID(),
    });
    const prepared = await operations.get(disposed.operationId, actor.id);
    await new ShareConsentService(db).grant(actor.id, {
      operationId: disposed.operationId,
      termsHash: prepared.termsHash,
      idempotencyKey: crypto.randomUUID(),
    });
    await decisions.create(parent.companyId, actor, {
      revisionId: await revisionId(parent.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TRANSFER_OWNED_SHARES',
        operation: disposed,
        authorizationDecisionId: null,
      },
    });
    await assertWorkspaceDirectory(db, {
      actor: other,
      parentId: parent.companyId,
      disposedId: child.companyId,
      decisionId: id,
    });
    expect((await new VotingService(db).detail(vote.id, other.id, false)).entityVoters).toEqual([
      {
        owner: { type: 'COMPANY', id: parent.companyId },
        weight: childConfiguration.totalShares,
        hasVoted: false,
      },
    ]);
    expect(await new VotingService(db).list(other.id, false)).toContain(vote.id);
    expect((await decisions.proof(id, other)).record.id).toBe(id);
    await expect(
      new VotingService(db).detail(vote.id, fixture.adminId, false),
    ).rejects.toMatchObject({ code: 'VOTING_NOT_FOUND' });
    expect(await new VotingService(db).list(fixture.adminId, false)).not.toContain(vote.id);
    await expect(
      new VotingService(db).cast(vote.id, actor.id, { choices: [yes.id], abstain: false }),
    ).rejects.toMatchObject({ code: 'VOTER_INELIGIBLE' });
    const command = {
      revisionId: await revisionId(parent.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'VOTE_AS_SHAREHOLDER' as const,
        votingId: vote.id,
        choices: [yes.id],
        abstain: false,
      },
    };
    const parentDecision = await decisions.create(parent.companyId, actor, command);
    expect((await new VotingService(db).detail(vote.id, actor.id, false)).status).toBe('CLOSED');
    await expect(
      decisions.create(parent.companyId, other, {
        ...command,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'ENTITY_BALLOT_UNAVAILABLE' });
    const ballots = await db
      .select()
      .from(votingBallots)
      .where(eq(votingBallots.votingId, vote.id));
    expect(ballots).toMatchObject([
      { voterId: parent.companyId, userId: actor.id, companyDecisionId: parentDecision },
    ]);
    expect(
      await db
        .select()
        .from(companyDecisions)
        .where(
          and(
            eq(companyDecisions.companyId, parent.companyId),
            eq(companyDecisions.createdBy, other.id),
          ),
        ),
    ).toHaveLength(0);
    expect((await decisions.proof(id, actor)).ready).toBe(true);
    await decisions.apply(id, actor);
  });
  it('lets a state-owned company govern through shareholder voting without inventing corporate officers', async () => {
    const { db, fixture } = context();
    const actor = { id: fixture.founderId, admin: false };
    const configuration = officeCompanyConfiguration(actor.id, fixture.stateId);
    configuration.allocations = [
      { owner: { type: 'STATE', id: fixture.stateId }, shares: configuration.totalShares },
    ];
    configuration.charter.offices = [];
    configuration.charter.policies = [
      {
        action: 'UPDATE_PROFILE',
        procedure: {
          mechanism: 'SHAREHOLDER_VOTE',
          officeIds: [],
          vote: null,
          manualProcedure: {},
        },
        financialBands: [],
      },
    ];
    const draft = await prepareCompany(db, { applicantId: actor.id, configuration });
    const directives = new MonetaryDirectiveService(db);
    await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'CONSENT_COMPANY_FORMATION',
        companyId: draft.companyId,
        formationHash: draft.formationHash,
      },
    });
    await submitPreparedCompany(db, draft);
    const decisions = new CompanyDecisionService(db);
    const command = {
      revisionId: await revisionId(draft.companyId),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'UPDATE_PROFILE' as const,
        name: { en: 'State shareholder decision' },
        description: {},
        categories: [],
      },
    };
    await expect(
      decisions.create(draft.companyId, { id: fixture.citizenId, admin: false }, command),
    ).rejects.toMatchObject({ code: 'COMPANY_AUTHORITY_REQUIRED' });
    const id = await decisions.create(draft.companyId, actor, command);
    const [vote] = (await decisions.proof(id, actor)).votes;
    if (!vote) {
      throw new Error('State shareholder vote missing');
    }
    const detail = await new VotingService(db).detail(vote.id, actor.id, false);
    expect(detail.eligible).toBe(false);
    const [yes] = detail.input.options;
    if (!yes) {
      throw new Error('State ballot approval option missing');
    }
    const ballot = {
      kind: 'VOTE_AS_SHAREHOLDER' as const,
      votingId: vote.id,
      choices: [yes.id],
      abstain: false,
    };
    await expect(
      directives.create(
        fixture.stateId,
        { id: fixture.citizenId, admin: false },
        { idempotencyKey: crypto.randomUUID(), payload: ballot },
      ),
    ).rejects.toMatchObject({ code: 'MONETARY_AUTHORITY_REQUIRED' });
    const directiveId = await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: ballot,
    });
    expect(
      await db.select().from(votingBallots).where(eq(votingBallots.votingId, vote.id)),
    ).toMatchObject([{ voterId: fixture.stateId, stateDirectiveId: directiveId }]);
    await closeVote(vote.id);
    expect((await decisions.proof(id, actor)).ready).toBe(true);
    await decisions.apply(id, actor);
    expect(
      await db
        .select()
        .from(companyOfficeHolders)
        .where(eq(companyOfficeHolders.revisionId, command.revisionId)),
    ).toHaveLength(0);
    await assertStateVotingLockOrder(db, {
      stateId: fixture.stateId,
      companyId: draft.companyId,
      actorId: actor.id,
    });
  });
});
