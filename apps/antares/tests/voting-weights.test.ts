import { describe, expect, it } from 'vitest';
import { calculateResult } from '../src/modules/voting/domain';
import type { VotingInput } from '../src/modules/voting/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';

const YES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function weightedPoll(): VotingInput {
  return {
    title: { en: 'Corporate action' },
    description: {},
    options: [
      { id: YES, label: { en: 'Approve' } },
      { id: NO, label: { en: 'Reject' } },
    ],
    electorate: { type: 'GLOBAL_USERS' },
    opensAt: '2026-10-18T00:00:00Z',
    closesAt: '2026-10-19T00:00:00Z',
    rules: { ...emptyConfiguration().governance.votingDefaults, thresholdKind: 'SIMPLE_MAJORITY' },
    maxSelections: 1,
    resultVisibility: 'ELIGIBLE_ONLY',
  };
}
describe('exact generic voting weights', () => {
  it('decides a one-share majority above the safe Number range while retaining head counts separately', () => {
    const input = weightedPoll();
    const result = calculateResult(input, { count: 2, weight: '18014398509481985' }, [
      { abstain: false, choices: [YES], weight: '9007199254740993' },
      { abstain: false, choices: [NO], weight: '9007199254740992' },
    ]);
    expect(result).toMatchObject({
      eligible: 2,
      participating: 2,
      quorumMet: true,
      weights: { eligible: '18014398509481985', participating: '18014398509481985' },
    });
    expect(result.options).toEqual([
      { id: YES, votes: 1, approved: true },
      { id: NO, votes: 1, approved: false },
    ]);
    expect(result.weights?.options).toEqual([
      { id: YES, weight: '9007199254740993' },
      { id: NO, weight: '9007199254740992' },
    ]);
  });
  it('uses frozen total shares for quorum and absolute majority, including the exact half boundary', () => {
    const input = weightedPoll();
    input.rules.quorumPercent = 50;
    input.rules.thresholdKind = 'ABSOLUTE_MAJORITY';
    const electorate = { count: 2, weight: '18014398509481985' };
    const below = calculateResult(input, electorate, [
      { abstain: false, choices: [YES], weight: '9007199254740992' },
    ]);
    const above = calculateResult(input, electorate, [
      { abstain: false, choices: [YES], weight: '9007199254740993' },
    ]);
    expect(below.quorumMet).toBe(false);
    expect(below.options[0]?.approved).toBe(false);
    expect(above.quorumMet).toBe(true);
    expect(above.options[0]?.approved).toBe(true);
  });
  it('compares configured decimal percentages as exact rational values and supports exponential notation', () => {
    const input = weightedPoll();
    input.rules.quorumPercent = 0;
    input.rules.thresholdKind = 'PERCENT';
    input.rules.thresholdPercent = 33.333333333333336;
    const ballots = [
      { abstain: false, choices: [YES], weight: '1' },
      { abstain: false, choices: [NO], weight: '2' },
    ];
    expect(calculateResult(input, { count: 2, weight: '3' }, ballots).options[0]?.approved).toBe(
      false,
    );
    input.rules.thresholdPercent = 33.33333333333333;
    expect(calculateResult(input, { count: 2, weight: '3' }, ballots).options[0]?.approved).toBe(
      true,
    );
    input.rules.quorumPercent = 1e-7;
    expect(
      calculateResult(input, { count: 2, weight: '1000000001' }, [
        { abstain: false, choices: [YES], weight: '1' },
      ]).quorumMet,
    ).toBe(false);
    expect(
      calculateResult(input, { count: 2, weight: '1000000000' }, [
        { abstain: false, choices: [YES], weight: '1' },
      ]).quorumMet,
    ).toBe(true);
  });
  it('counts abstention weight for quorum, excludes it from decisive weight and still requires all shares for unanimity', () => {
    const input = weightedPoll();
    const ballots = [
      { abstain: false, choices: [YES], weight: '1' },
      { abstain: true, choices: [], weight: '999999999999999999999999999999' },
    ];
    const electorate = { count: 2, weight: '1000000000000000000000000000000' };
    expect(calculateResult(input, electorate, ballots).options[0]?.approved).toBe(true);
    input.rules.thresholdKind = 'UNANIMOUS';
    const unanimous = calculateResult(input, electorate, ballots);
    expect(unanimous.options[0]?.approved).toBe(false);
    expect(unanimous.weights?.abstentions).toBe('999999999999999999999999999999');
    expect(calculateResult(input, 0, []).quorumMet).toBe(false);
  });
  it('rejects malformed or zero ballot weights instead of coercing them', () => {
    const input = weightedPoll();
    for (const weight of ['0', '-1', '1.5', '01', '1e3']) {
      expect(() =>
        calculateResult(input, { count: 1, weight: '1' }, [
          { abstain: false, choices: [YES], weight },
        ]),
      ).toThrow();
    }
  });
});
