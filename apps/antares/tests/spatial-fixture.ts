import type { Database } from '../src/db';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateReformService } from '../src/modules/states/reforms';
import type { Policy } from '../src/modules/states/contracts';
import type { TerritoryGeometry } from '../src/modules/spatial/contracts';
import type { LocalizedInput } from '../src/modules/localized-content/contracts';

async function addTerritorialAuthority(
  db: Database['db'],
  fixture: Readonly<{
    stateId: string;
    founderId: string;
    officeId: string;
    name?: LocalizedInput;
  }>,
  mechanism: Policy['mechanism'] = 'SINGLE_OFFICE',
): Promise<void> {
  const reforms = new StateReformService(db);
  const drafts = new StateDraftService(db);
  const id = await reforms.create(fixture.stateId, fixture.founderId);
  const draft = await drafts.get(id, fixture.founderId);
  const policy: Policy = {
    action: 'CHANGE_TERRITORY',
    mechanism,
    officeIds: mechanism === 'CITIZEN_VOTE' ? [] : [fixture.officeId],
    vote: null,
    manualProcedure: {},
  };
  const saved = await drafts.save(id, fixture.founderId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      name: fixture.name ?? draft.configuration.name,
      governance: {
        ...draft.configuration.governance,
        policies: [
          ...draft.configuration.governance.policies.filter(
            (item) => item.action !== 'CHANGE_TERRITORY',
          ),
          policy,
        ],
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
// oxlint-disable-next-line max-params -- A geometry fixture names all four Minecraft bounding-box coordinates.
function rectangle(minX: number, minZ: number, maxX: number, maxZ: number): TerritoryGeometry {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minX, minZ],
        [maxX, minZ],
        [maxX, maxZ],
        [minX, maxZ],
        [minX, minZ],
      ],
    ],
  };
}
export { addTerritorialAuthority, rectangle };
