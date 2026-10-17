import { describe, expect, it } from 'vitest';
import type { GovernancePolicy, StateDetail } from '@helicraft/alhena';
import { emptyConfiguration } from '../../antares/src/modules/states/domain';
import { applyPreset } from '../../antares/src/modules/states/presets';
import { managementSections } from '../src/states/management-access';

const ACTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CITIZEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function stateWithPolicy(mechanism: GovernancePolicy['mechanism']): StateDetail {
  const governance = applyPreset('AUTOCRACY', ACTOR);
  const [office] = governance.offices;
  if (office === undefined) {
    throw new Error('Fixture requires an office');
  }
  return {
    id: 'state',
    slug: 'aurora',
    status: 'ACTIVE',
    statusReason: null,
    configuration: {
      ...emptyConfiguration(),
      governance: {
        ...governance,
        policies: [
          ...governance.policies,
          {
            action: 'SPEND_TREASURY',
            mechanism,
            officeIds: [office.id],
            vote: null,
            manualProcedure: {},
          },
        ],
      },
    },
    founders: [{ id: ACTOR, name: 'Founder', type: 'PRIMARY' }],
    citizens: [
      { id: ACTOR, name: 'Founder' },
      { id: CITIZEN, name: 'Citizen' },
    ],
    holders: [
      { officeId: office.id, userId: ACTOR, name: 'Founder', since: '2026-10-18T00:00:00Z' },
    ],
    governanceRevisionId: 'revision',
    governanceRevision: 1,
    constitutionRevisionId: null,
    createdAt: '2026-10-18T00:00:00Z',
    constitutionHtml: [],
  };
}
describe('state management access', () => {
  it('uses current holders and policies rather than preset metadata', () => {
    const state = stateWithPolicy('SINGLE_OFFICE');
    expect(managementSections(state, ACTOR)).toContain('treasury');
    expect(managementSections(state, CITIZEN)).not.toContain('treasury');
    expect(managementSections({ ...state, holders: [] }, ACTOR)).not.toContain('treasury');
    expect(managementSections(state, 'outsider')).toStrictEqual([]);
  });
  it('includes citizen decisions and hides unconfigured, inactive and text-only tools', () => {
    const state = stateWithPolicy('CITIZEN_VOTE');
    expect(managementSections(state, CITIZEN)).toContain('treasury');
    expect(managementSections(state, CITIZEN)).not.toContain('bank');
    expect(managementSections(state, CITIZEN)).not.toContain('identity');
    expect(managementSections(state, CITIZEN)).not.toContain('constitution');
    expect(managementSections({ ...state, status: 'SUSPENDED' }, ACTOR)).not.toContain('treasury');
    expect(managementSections({ ...state, status: 'SUSPENDED' }, ACTOR)).toContain('history');
  });
});
