// oxlint-disable max-statements, unicorn/no-await-expression-member -- This shared real-database test scenario uses sequential assertions across one lifecycle; it has no runtime consumers.
import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';
import type { Database } from '../src/db';
import {
  stateReformVotes,
  votings,
  stateGovernanceRevisions,
  stateOffices,
} from '../src/db/schema';
import { completion } from '../src/modules/states/domain';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateReformService } from '../src/modules/states/reforms';
import { StateService } from '../src/modules/states/service';
import { readProposal } from '../src/modules/states/proposals';
import { VotingService } from '../src/modules/voting/service';

type Scenario = Readonly<{
  stateId: string;
  founderId: string;
  citizenId: string;
  adminId: string;
}>;
// oxlint-disable-next-line max-lines-per-function -- The scenario checks proposal identity, supersession and current office authority on real PostgreSQL.
async function officeReform(db: Database['db'], input: Scenario): Promise<void> {
  const reforms = new StateReformService(db);
  const drafts = new StateDraftService(db);
  const draftId = await reforms.create(input.stateId, input.citizenId);
  const draft = await drafts.get(draftId, input.citizenId);
  expect(draft.progress).toBe(completion(draft.configuration, input.founderId));
  const configuration = { ...draft.configuration, name: { en: 'Aurora revised' } };
  const saved = await drafts.save(draftId, input.citizenId, {
    configuration,
    version: draft.version,
    title: 'Private label',
    step: 12,
  });
  const proposalId = await reforms.propose(draftId, input.citizenId, saved.version);
  const [office] = configuration.governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  const approval = {
    draftId,
    ownerId: input.citizenId,
    officeId: office.id,
    version: saved.version,
  };
  await expect(reforms.approveOffice(approval, input.citizenId)).rejects.toThrow('держатель');
  await reforms.approveOffice(approval, input.founderId);
  const changed = await drafts.save(draftId, input.citizenId, {
    configuration: { ...configuration, description: { en: 'Changed after approval' } },
    version: saved.version,
    title: 'Private label',
    step: 11,
  });
  expect(
    (await readProposal(db, { proposalId, actorId: input.founderId, locale: 'en' })).status,
  ).toBe('SUPERSEDED');
  await expect(reforms.publish(draftId, input.citizenId, changed.version)).rejects.toThrow(
    'рассмотрение',
  );
  const restored = await drafts.save(draftId, input.citizenId, {
    configuration,
    version: changed.version,
    title: 'Renamed private label',
    step: 12,
  });
  expect(await reforms.propose(draftId, input.citizenId, restored.version)).toBe(proposalId);
  const publishedId = await reforms.publish(draftId, input.citizenId, restored.version);
  expect((await new StateService(db).detail(input.stateId, 'en')).configuration.name.en).toBe(
    'Aurora revised',
  );
  expect(
    (await readProposal(db, { proposalId, actorId: input.founderId, locale: 'en' })).status,
  ).toBe('PUBLISHED');
  await expect(
    db
      .update(stateGovernanceRevisions)
      .set({ reason: 'Mutated history' })
      .where(eq(stateGovernanceRevisions.id, publishedId)),
  ).rejects.toThrow();
}
// oxlint-disable-next-line max-lines-per-function -- Citizen voting is exercised from proposal creation through closed quorum and immutable publication.
async function citizenReform(db: Database['db'], input: Scenario): Promise<void> {
  const states = new StateService(db);
  const reforms = new StateReformService(db);
  const current = await states.detail(input.stateId, 'en', { actorId: input.adminId, admin: true });
  const configuration = structuredClone(current.configuration);
  configuration.governance.policies = configuration.governance.policies.map((policy) =>
    policy.action === 'AMEND_GOVERNANCE'
      ? { ...policy, mechanism: 'CITIZEN_VOTE', officeIds: [], vote: null }
      : policy,
  );
  await reforms.adminOverride(
    {
      stateId: input.stateId,
      baseRevisionId: current.governanceRevisionId,
      configuration,
      reason: 'Enable citizen approval',
    },
    input.adminId,
  );
  const draftId = await reforms.create(input.stateId, input.founderId);
  const drafts = new StateDraftService(db);
  const draft = await drafts.get(draftId, input.founderId);
  const saved = await drafts.save(draftId, input.founderId, {
    version: draft.version,
    step: 12,
    title: 'Private vote draft',
    configuration: { ...draft.configuration, description: { en: 'Citizen-approved reform' } },
  });
  const votingId = await reforms.startVote(draftId, input.founderId, saved.version);
  expect(await reforms.startVote(draftId, input.founderId, saved.version)).toBe(votingId);
  const [mapping] = await db
    .select()
    .from(stateReformVotes)
    .where(and(eq(stateReformVotes.draftId, draftId), eq(stateReformVotes.version, saved.version)));
  if (!mapping) {
    throw new Error('Vote missing');
  }
  const voting = new VotingService(db);
  await expect(reforms.publish(draftId, input.founderId, saved.version)).rejects.toThrow(
    'одобрена',
  );
  await voting.cast(votingId, input.founderId, {
    choices: [mapping.approvalOptionId],
    abstain: false,
  });
  await voting.cast(votingId, input.citizenId, {
    choices: [mapping.approvalOptionId],
    abstain: false,
  });
  await db.update(votings).set({ closesAt: new Date() }).where(eq(votings.id, votingId));
  await voting.tick();
  expect((await voting.detail(votingId, input.founderId, false)).status).toBe('CLOSED');
  await reforms.publish(draftId, input.founderId, saved.version);
  expect((await states.detail(input.stateId, 'en')).configuration.description.en).toBe(
    'Citizen-approved reform',
  );
}
// oxlint-disable-next-line max-lines-per-function -- Removal and reintroduction must preserve stable identity while starting a new holder interval.
async function officeIdentityScenario(db: Database['db'], input: Scenario): Promise<void> {
  const states = new StateService(db);
  const reforms = new StateReformService(db);
  const original = await states.detail(input.stateId, 'en', {
    actorId: input.adminId,
    admin: true,
  });
  const [office] = original.configuration.governance.offices;
  if (office === undefined) {
    throw new Error('Office missing');
  }
  const removed = structuredClone(original.configuration);
  removed.governance.offices = [];
  removed.governance.policies = removed.governance.policies.map((policy) => ({
    ...policy,
    mechanism: 'CITIZEN_VOTE',
    officeIds: [],
  }));
  const removalId = await reforms.adminOverride(
    {
      stateId: input.stateId,
      configuration: removed,
      baseRevisionId: original.governanceRevisionId,
      reason: 'Retire office',
    },
    input.adminId,
  );
  const withoutOffice = await states.detail(input.stateId, 'en');
  expect(withoutOffice.holders).toHaveLength(0);
  await reforms.adminOverride(
    {
      stateId: input.stateId,
      configuration: original.configuration,
      baseRevisionId: removalId,
      reason: 'Restore office identity',
    },
    input.adminId,
  );
  const restored = await states.detail(input.stateId, 'en');
  expect(restored.holders).toHaveLength(1);
  expect(restored.holders[0]?.officeId).toBe(office.id);
  expect(
    await db.select().from(stateOffices).where(eq(stateOffices.stateId, input.stateId)),
  ).toHaveLength(1);
  const reassigned = structuredClone(original.configuration);
  const [assignment] = reassigned.governance.offices;
  if (assignment === undefined) {
    throw new Error('Office missing');
  }
  assignment.initialHolderIds = [input.citizenId];
  const reassignmentId = await reforms.adminOverride(
    {
      stateId: input.stateId,
      configuration: reassigned,
      baseRevisionId: restored.governanceRevisionId,
      reason: 'Correct current holder',
    },
    input.adminId,
  );
  const pinned = await states.detail(input.stateId, 'en', {
    actorId: input.founderId,
    revisionId: reassignmentId,
  });
  expect(pinned.holders).toHaveLength(1);
  expect(pinned.holders[0]?.userId).toBe(input.citizenId);
}
export { officeReform, citizenReform, officeIdentityScenario };
