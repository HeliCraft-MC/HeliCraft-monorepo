import { describe, expect, it } from 'vitest';
import { calculateResult, validateBallot, validateVoting } from '../src/modules/voting/domain';
import type { VotingInput } from '../src/modules/voting/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';

function survey(): VotingInput {
  const options = ['Yes', 'No', 'North', 'South', 'East'].map((label) => ({
    id: crypto.randomUUID(),
    label: { en: label },
  }));
  return {
    title: { en: 'Community survey' },
    description: {},
    options,
    questions: [
      {
        id: crypto.randomUUID(),
        title: { en: 'Build a port?' },
        optionIds: options.slice(0, 2).map((option) => option.id),
        maxSelections: 1,
      },
      {
        id: crypto.randomUUID(),
        title: { en: 'Where?' },
        optionIds: options.slice(2).map((option) => option.id),
        maxSelections: 2,
      },
    ],
    opensAt: '2026-10-13T00:00:00Z',
    closesAt: '2026-10-14T00:00:00Z',
    electorate: { type: 'GLOBAL_USERS' },
    rules: { ...emptyConfiguration().governance.votingDefaults, quorumPercent: 0 },
    maxSelections: 1,
    resultVisibility: 'PUBLIC',
  };
}
function ids(input: VotingInput): string[] {
  return input.options.map((option) => option.id);
}

describe('multi-question voting', () => {
  it('accepts independent question limits and rejects partial, duplicate and excessive answers', () => {
    const input = survey();
    const [yes, no, north, south, east] = ids(input);
    if (
      yes === undefined ||
      no === undefined ||
      north === undefined ||
      south === undefined ||
      east === undefined
    ) {
      throw new Error('Missing options');
    }
    expect(() => {
      validateVoting({ ...input, maxSelections: 50 });
    }).not.toThrow();
    expect(() => {
      validateBallot(input, [yes, north, south], false);
    }).not.toThrow();
    expect(() => {
      validateBallot(input, [yes], false);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(input, [yes, no, north], false);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(input, [yes, north, south, east], false);
    }).toThrow('Некорректный');
    expect(() => {
      validateBallot(input, [yes, north, north], false);
    }).toThrow('Некорректный');
  });
  it('rejects overlapping or missing question options and multi-question state polls', () => {
    const input = survey();
    const first = input.questions?.[0];
    const second = input.questions?.[1];
    if (!first || !second) {
      throw new Error('Missing questions');
    }
    expect(() => {
      validateVoting({
        ...input,
        questions: [first, { ...second, optionIds: [...second.optionIds, ...first.optionIds] }],
      });
    }).toThrow('Проверьте');
    expect(() => {
      validateVoting({ ...input, questions: [first] });
    }).toThrow('Проверьте');
    expect(() => {
      validateVoting({
        ...input,
        electorate: { type: 'STATE_CITIZENS', stateId: crypto.randomUUID() },
      });
    }).toThrow('Проверьте');
  });
  it('counts one participant for a whole ballot and permits only whole-poll abstention', () => {
    const input = survey();
    const choices = [input.options[0]?.id, input.options[2]?.id].filter(
      (id): id is string => id !== undefined,
    );
    expect(() => {
      validateBallot(input, [], true);
    }).not.toThrow();
    expect(() => {
      validateBallot(input, choices, true);
    }).toThrow('Некорректный');
    const result = calculateResult(input, 2, [
      { choices, abstain: false },
      { choices: [], abstain: true },
    ]);
    expect(result.participating).toBe(2);
    expect(result.abstentions).toBe(1);
    expect(result.options.filter((option) => option.approved)).toHaveLength(2);
  });
});
