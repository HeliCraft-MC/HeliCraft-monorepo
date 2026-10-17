import { describe, expect, it } from 'vitest';
import { applyPreset } from '../src/modules/states/presets';
import {
  assignmentRequirements,
  assignmentApprovalsMet,
} from '../src/modules/states/office-assignment-domain';
import type { Governance, Office, Policy } from '../src/modules/states/contracts';

function fixture(): {
  governance: Governance;
  office: Office;
  input: { stateId: string; kind: 'APPOINT'; wasVacant: boolean; replacedUserId: string | null };
} {
  const governance = applyPreset('PRESIDENTIAL_REPUBLIC', crypto.randomUUID());
  const [office] = governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  return {
    governance,
    office,
    input: {
      stateId: crypto.randomUUID(),
      kind: 'APPOINT',
      wasVacant: false,
      replacedUserId: null,
    },
  };
}
function policy(
  action: Policy['action'],
  mechanism: Policy['mechanism'],
  officeIds: string[] = [],
): Policy {
  return { action, mechanism, officeIds, vote: null, manualProcedure: {} };
}
describe('office appointment authority', () => {
  it('joins the published decision policy and office rule independently of preset metadata', () => {
    const { governance, office, input } = fixture();
    governance.createdFromPreset = 'AUTOCRACY';
    const requirements = assignmentRequirements(office, governance, input);
    expect(requirements.votes[0]?.electorate).toEqual({
      type: 'STATE_CITIZENS',
      stateId: input.stateId,
    });
    expect(requirements.approvalGroups).toEqual([{ mode: 'ALL', officeIds: [office.id] }]);
    expect(requirements.manual).toBe(false);
  });
  it('requires a removal policy for replacements and preserves joint approval groups', () => {
    const { governance, office, input } = fixture();
    governance.policies = [policy('APPOINT_OFFICE_HOLDER', 'SINGLE_OFFICE', [office.id])];
    const replacement = { ...input, replacedUserId: crypto.randomUUID() };
    expect(() => assignmentRequirements(office, governance, replacement)).toThrow('снятия');
    const other = crypto.randomUUID();
    governance.policies.push(policy('REMOVE_OFFICE_HOLDER', 'ANY_OF_OFFICES', [office.id, other]));
    const requirements = assignmentRequirements(office, governance, replacement);
    expect(assignmentApprovalsMet(requirements.approvalGroups, new Set([other]))).toBe(false);
    expect(assignmentApprovalsMet(requirements.approvalGroups, new Set([office.id]))).toBe(true);
  });
  it('deduplicates identical electorates and rules but preserves different removal thresholds', () => {
    const { governance, office, input } = fixture();
    governance.policies = [
      policy('APPOINT_OFFICE_HOLDER', 'CITIZEN_VOTE'),
      policy('REMOVE_OFFICE_HOLDER', 'CITIZEN_VOTE'),
    ];
    const replacement = { ...input, replacedUserId: crypto.randomUUID() };
    expect(assignmentRequirements(office, governance, replacement).votes).toHaveLength(1);
    const removal = governance.policies.find((item) => item.action === 'REMOVE_OFFICE_HOLDER');
    if (!removal) {
      throw new Error('Removal policy missing');
    }
    removal.vote = { ...governance.votingDefaults, quorumPercent: 0 };
    expect(
      assignmentRequirements(office, governance, replacement).votes.map((vote) => vote.source),
    ).toEqual(['POLICY', 'REMOVAL_POLICY']);
  });
  it('uses the vacancy procedure and refuses missing appointing authority', () => {
    const { governance, office, input } = fixture();
    office.vacancy = 'MANUAL';
    expect(assignmentRequirements(office, governance, { ...input, wasVacant: true }).manual).toBe(
      true,
    );
    office.appointment = 'APPOINTED_BY_OFFICE';
    expect(() => assignmentRequirements(office, governance, input)).toThrow('назначающая');
    office.appointingOfficeId = crypto.randomUUID();
    expect(assignmentRequirements(office, governance, input).approvalGroups).toContainEqual({
      mode: 'ALL',
      officeIds: [office.appointingOfficeId],
    });
  });
  it('requires all signatures for a joint policy and rejects an undefined decision policy', () => {
    const { governance, office, input } = fixture();
    governance.policies = [];
    expect(() => assignmentRequirements(office, governance, input)).toThrow('не настроена');
    const other = crypto.randomUUID();
    governance.policies = [policy('APPOINT_OFFICE_HOLDER', 'MULTIPLE_OFFICES', [office.id, other])];
    const requirements = assignmentRequirements(office, governance, input);
    expect(assignmentApprovalsMet(requirements.approvalGroups, new Set([office.id]))).toBe(false);
    expect(assignmentApprovalsMet(requirements.approvalGroups, new Set([office.id, other]))).toBe(
      true,
    );
  });
});
