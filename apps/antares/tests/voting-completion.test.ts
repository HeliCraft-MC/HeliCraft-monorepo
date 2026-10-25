import { describe, expect, it } from 'vitest';
import { votingCompletion } from '../src/modules/voting/completion';
import { calculateResult } from '../src/modules/voting/domain';
import type { VotingInput } from '../src/modules/voting/contracts';
import type { WeightedBallot } from '../src/modules/voting/weights';
import { emptyConfiguration } from '../src/modules/states/domain';

function poll(): VotingInput {
  return {
    title: { en: 'Decision' },
    description: {},
    options: [
      { id: 'yes', label: { en: 'Yes' } },
      { id: 'no', label: { en: 'No' } },
    ],
    electorate: { type: 'GLOBAL_USERS' },
    opensAt: '2026-10-23T00:00:00Z',
    closesAt: '2026-10-24T00:00:00Z',
    rules: { ...emptyConfiguration().governance.votingDefaults, thresholdKind: 'SIMPLE_MAJORITY' },
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
  };
}
const yes: WeightedBallot = { abstain: false, choices: ['yes'] };
const no: WeightedBallot = { abstain: false, choices: ['no'] };
const abstain: WeightedBallot = { abstain: true, choices: [] };

const ELECTORATE = 4;
function appendBallot(prefix: WeightedBallot[], ballot: WeightedBallot): WeightedBallot[] {
  return [...prefix, ballot];
}
function combinations(length: number): WeightedBallot[][] {
  let variants: WeightedBallot[][] = [[]];
  for (let index = 0; index < length; index += 1) {
    variants = variants.flatMap((prefix) =>
      [yes, no, abstain].map((ballot) => appendBallot(prefix, ballot)),
    );
  }
  return variants;
}
function assertAllCompletions(input: VotingInput, prefix: WeightedBallot[]): void {
  const result = calculateResult(input, ELECTORATE, prefix);
  const approved = result.options
    .filter((option) => option.approved)
    .map((option) => option.id)
    .join(',');
  const stable = combinations(ELECTORATE - prefix.length).every(
    (suffix) =>
      calculateResult(input, ELECTORATE, [...prefix, ...suffix])
        .options.filter((option) => option.approved)
        .map((option) => option.id)
        .join(',') === approved,
  );
  expect(votingCompletion(input, result) === 'DECIDED').toBe(stable);
}

describe('irreversible voting completion', () => {
  it('closes the 89 for, 2 against example but waits while the remaining electorate can reverse a result', () => {
    const input = poll();
    const ballots = [...Array.from({ length: 89 }, () => yes), no, no];
    expect(votingCompletion(input, calculateResult(input, 100, ballots))).toBe('DECIDED');
    expect(votingCompletion(input, calculateResult(input, 100, [yes, no]))).toBeNull();
  });
  it('requires quorum, respects opt out and closes all-voted choices even without the optional rule', () => {
    const input = poll();
    input.rules.thresholdKind = 'UNANIMOUS';
    input.rules.quorumPercent = 100;
    expect(votingCompletion(input, calculateResult(input, 3, [no]))).toBeNull();
    input.rules.closeWhenDecided = false;
    expect(votingCompletion(input, calculateResult(input, 3, [yes, yes]))).toBeNull();
    expect(votingCompletion(input, calculateResult(input, 3, [yes, no, abstain]))).toBe(
      'ALL_VOTED',
    );
    expect(votingCompletion(input, calculateResult(input, 0, []))).toBeNull();
  });
  it('uses exact frozen share weights beyond Number precision', () => {
    const input = poll();
    input.rules.quorumPercent = 0;
    const electorate = { count: 2, weight: '18014398509481985' };
    expect(
      votingCompletion(
        input,
        calculateResult(input, electorate, [{ ...yes, weight: '9007199254740992' }]),
      ),
    ).toBeNull();
    expect(
      votingCompletion(
        input,
        calculateResult(input, electorate, [{ ...yes, weight: '9007199254740993' }]),
      ),
    ).toBe('DECIDED');
  });
  it('does not close percentage votes when an unapproved option can still reach its threshold', () => {
    const input = poll();
    input.rules.thresholdKind = 'PERCENT';
    input.rules.thresholdPercent = 50;
    input.rules.quorumPercent = 0;
    expect(votingCompletion(input, calculateResult(input, 4, [yes, yes]))).toBeNull();
    expect(votingCompletion(input, calculateResult(input, 4, [yes, yes, yes]))).toBe('DECIDED');
  });
  it('matches exhaustive remaining ballot combinations for every threshold, partial turnout and abstention', () => {
    const input = poll();
    input.rules.quorumPercent = 0;
    const configurations = [
      'SIMPLE_MAJORITY',
      'ABSOLUTE_MAJORITY',
      'UNANIMOUS',
      'PERCENT',
    ] as const;
    const prefixes = [1, 2, 3].flatMap((length) => combinations(length));
    for (const kind of configurations) {
      input.rules.thresholdKind = kind;
      for (const prefix of prefixes) {
        assertAllCompletions(input, prefix);
      }
    }
  });
});
