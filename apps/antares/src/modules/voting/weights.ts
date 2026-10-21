import type { VotingInput } from './contracts';

const PERCENT = 100n;
const MAJORITY_DIVISOR = 2n;
interface WeightedBallot {
  readonly abstain: boolean;
  readonly choices: readonly string[];
  readonly weight?: string;
}
interface VotingWeights {
  readonly eligible: string;
  readonly participating: string;
  readonly abstentions: string;
  readonly options: readonly Readonly<{ id: string; weight: string; approved: boolean }>[];
  readonly quorumMet: boolean;
}
function integerWeight(value: string): bigint {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error('Voting weight must be an exact nonnegative integer');
  }
  return BigInt(value);
}
function reachesPercent(part: bigint, total: bigint, percent: number): boolean {
  if (!Number.isFinite(percent) || percent < 0 || percent > Number(PERCENT)) {
    throw new Error('Invalid voting percentage');
  }
  // Use the exact decimal value of the configured percentage, including exponential notation.
  const [coefficient = '', exponent = '0'] = percent.toString().split('e');
  const [whole = '', fraction = ''] = coefficient.split('.');
  const scale = fraction.length - Number(exponent);
  const numerator = BigInt(`${whole}${fraction}`) * (scale < 0 ? 10n ** BigInt(-scale) : 1n);
  const denominator = scale > 0 ? 10n ** BigInt(scale) : 1n;
  return part * PERCENT * denominator >= total * numerator;
}
function approvedWeight(
  rules: VotingInput['rules'],
  input: Readonly<{ votes: bigint; decisive: bigint; eligible: bigint }>,
): boolean {
  const { votes, decisive, eligible } = input;
  switch (rules.thresholdKind) {
    case 'SIMPLE_MAJORITY': {
      return votes * MAJORITY_DIVISOR > decisive;
    }
    case 'ABSOLUTE_MAJORITY': {
      return votes * MAJORITY_DIVISOR > eligible;
    }
    case 'UNANIMOUS': {
      return votes === eligible;
    }
    case 'PERCENT': {
      return decisive > 0n && reachesPercent(votes, decisive, rules.thresholdPercent);
    }
    default: {
      throw new Error('Unknown voting threshold');
    }
  }
}
function calculateWeights(
  input: Readonly<VotingInput>,
  eligibleWeight: string,
  ballots: readonly WeightedBallot[],
): VotingWeights {
  const eligible = integerWeight(eligibleWeight);
  const weighted = ballots.map((ballot) => ({
    ...ballot,
    units: integerWeight(ballot.weight ?? '1'),
  }));
  if (weighted.some((ballot) => ballot.units === 0n)) {
    throw new Error('A ballot must carry a positive frozen weight');
  }
  const participating = weighted.reduce((sum, ballot) => sum + ballot.units, 0n);
  const abstentions = weighted.reduce(
    (sum, ballot) => sum + (ballot.abstain ? ballot.units : 0n),
    0n,
  );
  const quorumMet =
    eligible > 0n && reachesPercent(participating, eligible, input.rules.quorumPercent);
  return {
    eligible: eligible.toString(),
    participating: participating.toString(),
    abstentions: abstentions.toString(),
    quorumMet,
    options: input.options.map((option) => {
      const votes = weighted.reduce(
        (sum, ballot) =>
          sum + (!ballot.abstain && ballot.choices.includes(option.id) ? ballot.units : 0n),
        0n,
      );
      return {
        id: option.id,
        weight: votes.toString(),
        approved:
          quorumMet &&
          approvedWeight(input.rules, { votes, decisive: participating - abstentions, eligible }),
      };
    }),
  };
}
export { calculateWeights, type WeightedBallot, type VotingWeights };
