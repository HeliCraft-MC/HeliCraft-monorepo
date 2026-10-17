import type { Database } from '../src/db';
import { userRoles } from '../src/db/schema';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { StateReformService } from '../src/modules/states/reforms';
import { applyPreset } from '../src/modules/states/presets';
import type { Policy } from '../src/modules/states/contracts';
import { ACTIONS } from '../src/modules/monetary/domain';

async function monetaryFixture(
  db: Database['db'],
  suffix = '',
): Promise<{
  stateId: string;
  officeId: string;
  founderId: string;
  citizenId: string;
  adminId: string;
}> {
  const identity = new IdentityService(db);
  const sessions = new SessionService(db);
  const founder = await sessions.authenticate(
    await identity.register(`MoneyFounder${suffix}`, 'A sufficiently long password'),
  );
  const citizen = await sessions.authenticate(
    await identity.register(`MoneyCitizen${suffix}`, 'A sufficiently long password'),
  );
  const admin = await sessions.authenticate(
    await identity.register(`MoneyReviewer${suffix}`, 'A sufficiently long password'),
  );
  const founderId = founder.principal.id;
  const citizenId = citizen.principal.id;
  const adminId = admin.principal.id;
  await db.insert(userRoles).values({ userId: adminId, role: 'ADMIN' });
  const drafts = new StateDraftService(db);
  const draft = await drafts.create(founderId, 'Money state');
  const governance = applyPreset('AUTOCRACY', founderId);
  const [office] = governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  const saved = await drafts.save(draft.id, founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      name: { en: 'Money state', ru: 'Денежное государство' },
      slug: `money-state${suffix.toLowerCase()}`,
      cofounderIds: [citizenId],
      governance,
    },
  });
  const states = new StateService(db);
  const stateId = await states.submit(draft.id, founderId, saved.version);
  await states.changeStatus(stateId, adminId, { status: 'ACTIVE', reason: 'Money fixture' });
  return { stateId, officeId: office.id, founderId, citizenId, adminId };
}
async function addMonetaryAuthority(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; officeId: string }>,
  bankVote = false,
): Promise<void> {
  const reforms = new StateReformService(db);
  const drafts = new StateDraftService(db);
  const id = await reforms.create(fixture.stateId, fixture.founderId);
  const draft = await drafts.get(id, fixture.founderId);
  const added: Policy[] = Object.values(ACTIONS).map((action) => ({
    action,
    mechanism: bankVote && action === 'ESTABLISH_CENTRAL_BANK' ? 'CITIZEN_VOTE' : 'SINGLE_OFFICE',
    officeIds: bankVote && action === 'ESTABLISH_CENTRAL_BANK' ? [] : [fixture.officeId],
    vote: null,
    manualProcedure: {},
  }));
  const saved = await drafts.save(id, fixture.founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      governance: {
        ...draft.configuration.governance,
        policies: [...draft.configuration.governance.policies, ...added],
      },
    },
  });
  await reforms.propose(id, fixture.founderId, saved.version);
  await reforms.approveOffice(
    { draftId: id, ownerId: fixture.founderId, version: saved.version, officeId: fixture.officeId },
    fixture.founderId,
  );
  await reforms.publish(id, fixture.founderId, saved.version);
}
export { monetaryFixture, addMonetaryAuthority };
