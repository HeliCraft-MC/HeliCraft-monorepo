import { OfficeAssignmentService } from '../src/modules/states/office-assignment-service';
// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Scenario fixture counts and response assertions exercise real persisted behavior.
import { expect } from 'vitest';
import type { Database } from '../src/db';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateReformService } from '../src/modules/states/reforms';
import { StateService } from '../src/modules/states/service';
import { applyPreset } from '../src/modules/states/presets';
import { leaveState } from '../src/modules/states/citizenship';
import { VotingService } from '../src/modules/voting/service';

// oxlint-disable-next-line max-lines-per-function, max-statements -- The persistent scenario verifies protected departure, holder history and frozen voting eligibility together.
async function assertCitizenshipDeparture(
  db: Database['db'],
  input: Readonly<{ founderId: string; citizenId: string; adminId: string }>,
): Promise<void> {
  const { founderId, citizenId, adminId } = input;
  const drafts = new StateDraftService(db);
  const service = new StateService(db);
  const draft = await drafts.create(founderId, 'Departure');
  const governance = applyPreset('AUTOCRACY', founderId);
  const [office] = governance.offices;
  if (!office) {
    throw new Error('Leader missing');
  }
  const configuration = {
    ...draft.configuration,
    slug: 'departure-check',
    name: { en: 'Departure check' },
    cofounderIds: [citizenId],
    governance: {
      ...governance,
      offices: [
        { ...office, required: true },
        {
          ...office,
          id: crypto.randomUUID(),
          name: { en: 'Delegate' },
          required: false,
          isHeadOfState: false,
          initialHolderIds: [citizenId],
        },
      ],
    },
  };
  const saved = await drafts.save(draft.id, founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration,
  });
  const id = await service.submit(draft.id, founderId, saved.version);
  await service.changeStatus(id, adminId, { status: 'ACTIVE', reason: 'Departure test' });
  const previous = await service.detail(id, 'en');
  await expect(leaveState(db, id, adminId)).rejects.toThrow('гражданства');
  await expect(leaveState(db, id, founderId)).rejects.toThrow('освободите все');
  expect((await service.detail(id, 'en')).citizens).toHaveLength(2);
  const voting = new VotingService(db);
  const yes = crypto.randomUUID();
  const votingId = await voting.create(adminId, {
    title: { en: 'Frozen electorate' },
    description: {},
    options: [
      { id: yes, label: { en: 'Yes' } },
      { id: crypto.randomUUID(), label: { en: 'No' } },
    ],
    opensAt: new Date(Date.now() - 1000).toISOString(),
    closesAt: new Date(Date.now() + 60_000).toISOString(),
    electorate: { type: 'STATE_CITIZENS', stateId: id },
    rules: governance.votingDefaults,
    maxSelections: 1,
    resultVisibility: 'PUBLIC',
  });
  await voting.publish(votingId, adminId);
  await expect(leaveState(db, id, citizenId)).rejects.toThrow('освободите все');
  const [, delegate] = configuration.governance.offices;
  if (delegate === undefined) {
    throw new Error('Delegate missing');
  }
  const assignments = new OfficeAssignmentService(db);
  const founder = { id: founderId, admin: false };
  const removal = await assignments.create(id, founder, {
    officeId: delegate.id,
    userId: citizenId,
    kind: 'REMOVE',
    replacedUserId: null,
  });
  await assignments.approve(removal, founder, office.id);
  await assignments.apply(removal, founder);
  await leaveState(db, id, citizenId);
  const current = await service.detail(id, 'en');
  expect(current.citizens).toHaveLength(1);
  expect(current.holders.some((holder) => holder.userId === citizenId)).toBe(false);
  const historical = await service.detail(id, 'en', {
    actorId: founderId,
    revisionId: previous.governanceRevisionId,
  });
  expect(historical.citizens).toHaveLength(2);
  expect(historical.holders.some((holder) => holder.userId === citizenId)).toBe(true);
  await voting.cast(votingId, citizenId, { choices: [yes], abstain: false });
  expect((await voting.detail(votingId, citizenId, false)).hasVoted).toBe(true);
  await expect(leaveState(db, id, citizenId)).rejects.toThrow('гражданства');
  await new StateReformService(db).adminOverride(
    {
      stateId: id,
      configuration: { ...current.configuration, description: { en: 'Amended after departure' } },
      baseRevisionId: current.governanceRevisionId,
      reason: 'Metadata amendment preserves departed holder history',
    },
    adminId,
  );
  const amended = await service.detail(id, 'en');
  expect(amended.holders.some((holder) => holder.userId === citizenId)).toBe(false);
  expect(amended.configuration.governance.offices[1]?.initialHolderIds).toEqual([citizenId]);
}
export { assertCitizenshipDeparture };
