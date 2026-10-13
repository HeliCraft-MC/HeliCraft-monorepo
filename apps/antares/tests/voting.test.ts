import { describe, expect, it } from 'vitest';
import { calculateResult, validateBallot, validateVoting } from '../src/modules/voting/domain';
import type { VotingInput } from '../src/modules/voting/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';

const YES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function poll(): VotingInput {
  return {
    title: { en: 'Reform' },
    description: {},
    options: [
      { id: YES, label: { en: 'Yes' } },
      { id: NO, label: { en: 'No' } },
    ],
    electorate: { type: 'GLOBAL_USERS' },
    opensAt: '2026-10-13T00:00:00Z',
    closesAt: '2026-10-14T00:00:00Z',
    rules: emptyConfiguration().governance.votingDefaults,
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
  };
}
describe('generic voting rules', () => {
  it('enforces quorum and excludes abstention from percentage approval denominator', () => {
    const result = calculateResult(poll(), 4, [
      { abstain: false, choices: [YES] },
      { abstain: true, choices: [] },
    ]);
    expect(result.quorumMet).toBe(true);
    expect(result.options[0]?.approved).toBe(true);
    expect(
      calculateResult(poll(), 5, [{ abstain: false, choices: [YES] }]).options[0]?.approved,
    ).toBe(false);
  });
  it('handles strict simple/absolute majority and unanimity', () => {
    const input = poll();
    input.rules.thresholdKind = 'SIMPLE_MAJORITY';
    expect(
      calculateResult(input, 2, [
        { abstain: false, choices: [YES] },
        { abstain: false, choices: [NO] },
      ]).options[0]?.approved,
    ).toBe(false);
    input.rules.thresholdKind = 'ABSOLUTE_MAJORITY';
    expect(
      calculateResult(input, 4, [
        { abstain: false, choices: [YES] },
        { abstain: false, choices: [YES] },
      ]).options[0]?.approved,
    ).toBe(false);
    input.rules.thresholdKind = 'UNANIMOUS';
    expect(
      calculateResult(input, 1, [{ abstain: false, choices: [YES] }]).options[0]?.approved,
    ).toBe(true);
  });
  it('rejects duplicate, unknown, empty or contradictory ballot choices', () => {
    expect(() => {
      validateBallot(poll(), [YES, YES], false);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(poll(), [], false);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(poll(), [YES], true);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(poll(), [YES], false);
    }).not.toThrow();
  });
  it('validates labels, unique options and timing', () => {
    const input = poll();
    input.closesAt = input.opensAt;
    expect(() => {
      validateVoting(input);
    }).toThrow('Завершение');
    input.closesAt = '2026-10-14T00:00:00Z';
    input.options[1] = input.options[0] ?? { id: YES, label: {} };
    expect(() => {
      validateVoting(input);
    }).toThrow('варианты');
  });
});
