// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Scenario fixture counts and response assertions exercise real persisted behavior.
import { expect } from 'vitest';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../src/db';
import { stateOfficeAssignments, stateOfficeHolders, votings } from '../src/db/schema';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { StateReformService } from '../src/modules/states/reforms';
import { OfficeAssignmentService } from '../src/modules/states/office-assignment-service';
import { VotingService } from '../src/modules/voting/service';
import { applyPreset } from '../src/modules/states/presets';

interface Participants {
  readonly founderId: string;
  readonly citizenId: string;
  readonly adminId: string;
}
async function assignmentFixture(db: Database['db'], input: Participants): Promise<string> {
  const drafts = new StateDraftService(db);
  const draft = await drafts.create(input.founderId, 'Office decisions');
  const governance = applyPreset('PRESIDENTIAL_REPUBLIC', input.founderId);
  const saved = await drafts.save(draft.id, input.founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      slug: 'office-decisions',
      name: { en: 'Office decisions' },
      cofounderIds: [input.citizenId],
      governance,
    },
  });
  const states = new StateService(db);
  const id = await states.submit(draft.id, input.founderId, saved.version);
  await states.changeStatus(id, input.adminId, { status: 'ACTIVE', reason: 'Assignment tests' });
  return id;
}
async function assertApprovalRenewal(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; input: Participants; officeId: string }>,
): Promise<void> {
  const { stateId, input, officeId } = fixture;
  const service = new OfficeAssignmentService(db);
  const citizen = { id: input.citizenId, admin: false };
  const id = await service.create(stateId, citizen, {
    officeId,
    userId: input.founderId,
    kind: 'APPOINT',
    replacedUserId: input.citizenId,
  });
  await service.approve(id, citizen, officeId);
  await db.transaction(async (transaction) => {
    await transaction
      .update(stateOfficeHolders)
      .set({ until: sql`transaction_timestamp()` })
      .where(and(eq(stateOfficeHolders.officeId, officeId), isNull(stateOfficeHolders.until)));
    await transaction
      .insert(stateOfficeHolders)
      .values({ officeId, userId: input.citizenId, since: sql`transaction_timestamp()` });
  });
  expect((await service.detail(id, citizen)).approvals[0]?.current).toBe(false);
  await service.approve(id, citizen, officeId);
  expect((await service.detail(id, citizen)).approvals[0]?.current).toBe(true);
  await service.cancel(id, citizen);
  expect((await service.detail(id, citizen)).status).toBe('CANCELLED');
  const reforms = new StateReformService(db);
  const reformId = await reforms.create(stateId, input.citizenId);
  const reform = await new StateDraftService(db).get(reformId, input.citizenId);
  expect(reform.configuration.governance.offices[0]?.initialHolderIds).toEqual([input.founderId]);
}

// oxlint-disable-next-line max-lines-per-function, max-statements -- Manual approval and stale-revision protection share the same reviewed state and immutable proposal.
async function assertManualDecision(
  db: Database['db'],
  stateId: string,
  input: Participants,
): Promise<void> {
  const states = new StateService(db);
  const current = await states.detail(stateId, 'en');
  const configuration = structuredClone(current.configuration);
  const [office] = configuration.governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  office.appointment = 'MANUAL_PROCEDURE';
  const reforms = new StateReformService(db);
  await reforms.adminOverride(
    {
      stateId,
      configuration,
      baseRevisionId: current.governanceRevisionId,
      reason: 'Manual procedure test',
    },
    input.adminId,
  );
  const service = new OfficeAssignmentService(db);
  const citizen = { id: input.citizenId, admin: false };
  const admin = { id: input.adminId, admin: true };
  const id = await service.create(stateId, citizen, {
    officeId: office.id,
    userId: input.founderId,
    kind: 'APPOINT',
    replacedUserId: input.citizenId,
  });
  await expect(service.apply(id, admin, 'Reviewed')).rejects.toThrow('Требуются');
  await service.approve(id, citizen, office.id);
  await expect(service.apply(id, citizen, 'Reviewed')).rejects.toThrow('Требуются');
  await expect(service.apply(id, admin)).rejects.toThrow('Требуются');
  await service.apply(id, admin, 'Both policies approved; manual succession checked');
  const staleId = await service.create(
    stateId,
    { id: input.founderId, admin: false },
    {
      officeId: office.id,
      userId: input.citizenId,
      kind: 'APPOINT',
      replacedUserId: input.founderId,
    },
  );
  const latest = await states.detail(stateId, 'en');
  await reforms.adminOverride(
    {
      stateId,
      configuration: { ...latest.configuration, description: { en: 'Changed description' } },
      baseRevisionId: latest.governanceRevisionId,
      reason: 'Metadata amendment',
    },
    input.adminId,
  );
  expect((await service.detail(staleId, admin)).stale).toBe(true);
  await expect(service.apply(staleId, admin, 'Reviewed')).rejects.toThrow('изменились');
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- One replacement exercises the joint published policies, frozen vote and atomic holder intervals.
async function assertOfficeAssignments(db: Database['db'], input: Participants): Promise<void> {
  const stateId = await assignmentFixture(db, input);
  const states = new StateService(db);
  const state = await states.detail(stateId, 'en');
  const [office] = state.configuration.governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  const service = new OfficeAssignmentService(db);
  const founder = { id: input.founderId, admin: false };
  const citizen = { id: input.citizenId, admin: false };
  const administrator = { id: input.adminId, admin: true };
  await expect(service.list(stateId, { ...administrator, admin: false })).rejects.toThrow();
  await expect(
    service.create(stateId, founder, {
      officeId: office.id,
      userId: input.founderId,
      kind: 'REMOVE',
      replacedUserId: null,
    }),
  ).rejects.toThrow('преемника');
  const id = await service.create(stateId, citizen, {
    officeId: office.id,
    userId: input.citizenId,
    kind: 'APPOINT',
    replacedUserId: input.founderId,
  });
  const decision = await service.detail(id, founder);
  expect(decision.approvalGroups).toHaveLength(2);
  expect(decision.votes).toHaveLength(1);
  await expect(service.approve(id, citizen, office.id)).rejects.toThrow('не позволяет');
  await service.approve(id, founder, office.id);
  await expect(service.apply(id, founder)).rejects.toThrow('Требуются');
  const [vote] = decision.votes;
  if (!vote) {
    throw new Error('Election missing');
  }
  const voting = new VotingService(db);
  const details = await voting.detail(vote.id, input.founderId, false);
  const [yes] = details.input.options;
  if (!yes) {
    throw new Error('Approval option missing');
  }
  await voting.cast(vote.id, input.founderId, { choices: [yes.id], abstain: false });
  await voting.cast(vote.id, input.citizenId, { choices: [yes.id], abstain: false });
  await db
    .update(votings)
    .set({ opensAt: sql`now() - interval '2 seconds'`, closesAt: sql`now() - interval '1 second'` })
    .where(eq(votings.id, vote.id));
  expect((await service.detail(id, founder)).ready).toBe(true);
  await expect(
    db
      .update(stateOfficeAssignments)
      .set({ userId: input.founderId })
      .where(eq(stateOfficeAssignments.id, id)),
  ).rejects.toThrow();
  await service.apply(id, citizen);
  await expect(service.apply(id, citizen)).rejects.toThrow('завершено');
  const current = await states.detail(stateId, 'en');
  expect(current.holders.map((holder) => holder.userId)).toEqual([input.citizenId]);
  const intervals = await db
    .select()
    .from(stateOfficeHolders)
    .where(eq(stateOfficeHolders.officeId, office.id));
  const previous = intervals.find((holder) => holder.userId === input.founderId);
  const successor = intervals.find((holder) => holder.userId === input.citizenId);
  expect(previous?.until?.toISOString()).toBe(successor?.since.toISOString());
  await expect(
    db
      .update(stateOfficeAssignments)
      .set({ status: 'PENDING', appliedAt: null })
      .where(eq(stateOfficeAssignments.id, id)),
  ).rejects.toThrow();
  await assertApprovalRenewal(db, { stateId, input, officeId: office.id });
  await assertManualDecision(db, stateId, input);
}
export { assertOfficeAssignments };
