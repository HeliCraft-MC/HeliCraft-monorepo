import type { VotingInput } from '../voting/contracts';

type AuthorityMechanism =
  | 'SINGLE_OFFICE'
  | 'ANY_OF_OFFICES'
  | 'MULTIPLE_OFFICES'
  | 'VOTE'
  | 'OFFICE_VOTE'
  | 'COMBINED'
  | 'MANUAL';
interface ApprovalGroup {
  readonly mode: 'ANY' | 'ALL';
  readonly officeIds: string[];
}
interface AuthorityProcedure {
  readonly mechanism: AuthorityMechanism;
  readonly officeIds: readonly string[];
  readonly vote: VotingInput['rules'] | null;
}
interface AuthorityRequirements<Electorate> {
  readonly approvalGroups: ApprovalGroup[];
  readonly votes: { electorate: Electorate; rules: VotingInput['rules'] }[];
  readonly manual: boolean;
}
function compileAuthority<Electorate>(
  procedure: AuthorityProcedure,
  context: Readonly<{
    electorate: Electorate;
    officeElectorate: Electorate;
    defaults: VotingInput['rules'];
  }>,
): AuthorityRequirements<Electorate> {
  const approvalGroups: ApprovalGroup[] = [
    'SINGLE_OFFICE',
    'ANY_OF_OFFICES',
    'MULTIPLE_OFFICES',
    'COMBINED',
  ].includes(procedure.mechanism)
    ? [
        {
          mode: procedure.mechanism === 'ANY_OF_OFFICES' ? 'ANY' : 'ALL',
          officeIds: [...procedure.officeIds],
        },
      ]
    : [];
  return {
    approvalGroups,
    votes: ['VOTE', 'OFFICE_VOTE', 'COMBINED'].includes(procedure.mechanism)
      ? [
          {
            electorate:
              procedure.mechanism === 'OFFICE_VOTE' ? context.officeElectorate : context.electorate,
            rules: procedure.vote ?? context.defaults,
          },
        ]
      : [],
    manual: procedure.mechanism === 'MANUAL',
  };
}
function approvalsSatisfied(
  groups: readonly ApprovalGroup[],
  offices: ReadonlySet<string>,
): boolean {
  return groups.every(
    (group) =>
      group.officeIds.length > 0 &&
      (group.mode === 'ANY'
        ? group.officeIds.some((id) => offices.has(id))
        : group.officeIds.every((id) => offices.has(id))),
  );
}
export {
  compileAuthority,
  approvalsSatisfied,
  type AuthorityMechanism,
  type AuthorityProcedure,
  type AuthorityRequirements,
  type ApprovalGroup,
};
