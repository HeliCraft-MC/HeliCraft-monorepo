import type { Governance, Office, Policy } from './contracts';
import type { VotingInput } from '../voting/contracts';
import { DomainError, HTTP } from '../errors';

interface ApprovalGroup {
  readonly mode: 'ANY' | 'ALL';
  readonly officeIds: string[];
}
interface AssignmentVote {
  readonly source: 'OFFICE' | 'POLICY' | 'REMOVAL_POLICY';
  readonly electorate: VotingInput['electorate'];
  readonly rules: Governance['votingDefaults'];
}
interface AssignmentRequirements {
  readonly approvalGroups: ApprovalGroup[];
  readonly votes: AssignmentVote[];
  readonly manual: boolean;
}
function policyRequirements(
  policy: Policy,
  stateId: string,
  defaults: Governance['votingDefaults'],
): AssignmentRequirements {
  const approvalGroups: ApprovalGroup[] = [
    'SINGLE_OFFICE',
    'ANY_OF_OFFICES',
    'MULTIPLE_OFFICES',
    'COMBINED',
  ].includes(policy.mechanism)
    ? [{ mode: policy.mechanism === 'ANY_OF_OFFICES' ? 'ANY' : 'ALL', officeIds: policy.officeIds }]
    : [];
  const votes: AssignmentVote[] = [];
  if (['CITIZEN_VOTE', 'COMBINED', 'COUNCIL_VOTE'].includes(policy.mechanism)) {
    votes.push({
      source: 'POLICY',
      rules: policy.vote ?? defaults,
      electorate:
        policy.mechanism === 'COUNCIL_VOTE'
          ? { type: 'OFFICE_HOLDERS', stateId, officeIds: policy.officeIds }
          : { type: 'STATE_CITIZENS', stateId },
    });
  }
  return { approvalGroups, votes, manual: policy.mechanism === 'MANUAL' };
}
function appointmentRequirements(
  office: Office,
  governance: Governance,
  input: Readonly<{ stateId: string; vacant: boolean }>,
): AssignmentRequirements {
  const { stateId, vacant } = input;
  const rule = vacant ? office.vacancy : office.appointment;
  if (rule === 'MANUAL' || rule === 'MANUAL_PROCEDURE') {
    return { approvalGroups: [], votes: [], manual: true };
  }
  if (rule === 'ELECTION' || rule === 'CITIZEN_VOTE') {
    return {
      approvalGroups: [],
      manual: false,
      votes: [
        {
          source: 'OFFICE',
          electorate: { type: 'STATE_CITIZENS', stateId },
          rules: governance.votingDefaults,
        },
      ],
    };
  }
  if (office.appointingOfficeId === null) {
    throw new DomainError(
      HTTP.conflict,
      'APPOINTMENT_AUTHORITY_MISSING',
      'В правилах должности не указана назначающая должность',
    );
  }
  if (rule === 'COUNCIL' || rule === 'COUNCIL_VOTE') {
    return {
      approvalGroups: [],
      manual: false,
      votes: [
        {
          source: 'OFFICE',
          electorate: { type: 'OFFICE_HOLDERS', stateId, officeIds: [office.appointingOfficeId] },
          rules: governance.votingDefaults,
        },
      ],
    };
  }
  return {
    manual: false,
    votes: [],
    approvalGroups: [{ mode: 'ALL', officeIds: [office.appointingOfficeId] }],
  };
}
function replacementRequirements(
  governance: Governance,
  input: Readonly<{ kind: 'APPOINT' | 'REMOVE'; stateId: string; replacedUserId: string | null }>,
): AssignmentRequirements {
  const removalPolicy =
    input.kind === 'APPOINT' && input.replacedUserId !== null
      ? governance.policies.find((item) => item.action === 'REMOVE_OFFICE_HOLDER')
      : undefined;
  if (input.replacedUserId !== null && removalPolicy === undefined) {
    throw new DomainError(
      HTTP.forbidden,
      'REMOVAL_POLICY_MISSING',
      'Для замены требуется процедура снятия с должности',
    );
  }
  const removal =
    removalPolicy === undefined
      ? { approvalGroups: [], votes: [], manual: false }
      : policyRequirements(removalPolicy, input.stateId, governance.votingDefaults);
  const votes: AssignmentVote[] = removal.votes.map((vote) => ({
    ...vote,
    source: 'REMOVAL_POLICY',
  }));
  return { ...removal, votes };
}
function assignmentRequirements(
  office: Office,
  governance: Governance,
  input: Readonly<{
    stateId: string;
    kind: 'APPOINT' | 'REMOVE';
    wasVacant: boolean;
    replacedUserId: string | null;
  }>,
): AssignmentRequirements {
  const action = input.kind === 'APPOINT' ? 'APPOINT_OFFICE_HOLDER' : 'REMOVE_OFFICE_HOLDER';
  const policy = governance.policies.find((item) => item.action === action);
  if (policy === undefined) {
    throw new DomainError(
      HTTP.forbidden,
      'OFFICE_POLICY_MISSING',
      'Процедура решения не настроена',
    );
  }
  const decision = policyRequirements(policy, input.stateId, governance.votingDefaults);
  const removal = replacementRequirements(governance, input);
  const appointment =
    input.kind === 'APPOINT'
      ? appointmentRequirements(office, governance, {
          stateId: input.stateId,
          vacant: input.wasVacant,
        })
      : { approvalGroups: [], votes: [], manual: false };
  const votes = [...decision.votes, ...appointment.votes, ...removal.votes].filter(
    (vote, index, all) =>
      all.findIndex(
        (other) =>
          JSON.stringify([other.electorate, other.rules]) ===
          JSON.stringify([vote.electorate, vote.rules]),
      ) === index,
  );
  return {
    manual: decision.manual || appointment.manual || removal.manual,
    approvalGroups: [
      ...decision.approvalGroups,
      ...appointment.approvalGroups,
      ...removal.approvalGroups,
    ],
    votes,
  };
}
function assignmentApprovalsMet(
  groups: readonly ApprovalGroup[],
  offices: ReadonlySet<string>,
): boolean {
  return groups.every((group) =>
    group.mode === 'ANY'
      ? group.officeIds.some((id) => offices.has(id))
      : group.officeIds.every((id) => offices.has(id)),
  );
}
export {
  assignmentRequirements,
  assignmentApprovalsMet,
  type AssignmentRequirements,
  type AssignmentVote,
};
