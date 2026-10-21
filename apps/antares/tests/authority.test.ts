import { describe, expect, it } from 'vitest';
import { compileAuthority, approvalsSatisfied } from '../src/modules/governance/authority';
import { emptyConfiguration } from '../src/modules/states/domain';

const defaults = emptyConfiguration().governance.votingDefaults;
const first = crypto.randomUUID();
const second = crypto.randomUUID();
describe('shared authority requirements', () => {
  it('compiles domain-provided electorates without granting powers from entity names or ownership', () => {
    const result = compileAuthority(
      { mechanism: 'COMBINED', officeIds: [first, second], vote: null },
      { electorate: 'frozen shareholders', officeElectorate: 'corporate offices', defaults },
    );
    expect(result.approvalGroups).toEqual([{ mode: 'ALL', officeIds: [first, second] }]);
    expect(result.votes).toEqual([{ electorate: 'frozen shareholders', rules: defaults }]);
    expect(result.manual).toBe(false);
    expect(approvalsSatisfied(result.approvalGroups, new Set([first]))).toBe(false);
    expect(approvalsSatisfied(result.approvalGroups, new Set([first, second]))).toBe(true);
  });
  it('supports immediate, alternative-office, office-vote and explicit manual procedures', () => {
    const context = { electorate: 'owners', officeElectorate: 'office holders', defaults };
    const immediate = compileAuthority(
      { mechanism: 'SINGLE_OFFICE', officeIds: [first], vote: null },
      context,
    );
    expect(immediate.votes).toEqual([]);
    expect(approvalsSatisfied(immediate.approvalGroups, new Set([first]))).toBe(true);
    const alternative = compileAuthority(
      { mechanism: 'ANY_OF_OFFICES', officeIds: [first, second], vote: null },
      context,
    );
    expect(approvalsSatisfied(alternative.approvalGroups, new Set([second]))).toBe(true);
    const vote = compileAuthority(
      { mechanism: 'OFFICE_VOTE', officeIds: [first], vote: { ...defaults, quorumPercent: 100 } },
      context,
    );
    expect(vote.votes[0]?.electorate).toBe('office holders');
    expect(vote.votes[0]?.rules.quorumPercent).toBe(100);
    expect(
      compileAuthority({ mechanism: 'MANUAL', officeIds: [], vote: null }, context).manual,
    ).toBe(true);
  });
  it('never satisfies an empty approval group and keeps the submitted office list independent', () => {
    expect(approvalsSatisfied([{ mode: 'ALL', officeIds: [] }], new Set())).toBe(false);
    expect(approvalsSatisfied([{ mode: 'ANY', officeIds: [] }], new Set())).toBe(false);
    const officeIds = [first];
    const result = compileAuthority(
      { mechanism: 'SINGLE_OFFICE', officeIds, vote: null },
      { electorate: 'owners', officeElectorate: 'offices', defaults },
    );
    officeIds.push(second);
    expect(result.approvalGroups[0]?.officeIds).toEqual([first]);
  });
});
