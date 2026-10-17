import type { MonetaryPolicy } from './contracts';
import { MAX_MINOR } from './domain';

function issuanceCapacity(
  policy: MonetaryPolicy | null,
  input: Readonly<{ supply: bigint; gross: bigint }>,
): bigint {
  if (policy === null) {
    return 0n;
  }
  const ceilings = [
    MAX_MINOR - input.supply,
    policy.maxSupplyMinor === null ? MAX_MINOR : BigInt(policy.maxSupplyMinor) - input.supply,
    policy.maxGrossIssuance30dMinor === null
      ? MAX_MINOR
      : BigInt(policy.maxGrossIssuance30dMinor) - input.gross,
    policy.maxIssuancePerOperationMinor === null
      ? MAX_MINOR
      : BigInt(policy.maxIssuancePerOperationMinor),
  ];
  let smallest = MAX_MINOR;
  for (const ceiling of ceilings) {
    smallest = ceiling < smallest ? ceiling : smallest;
  }
  return smallest > 0n ? smallest : 0n;
}
export { issuanceCapacity };
