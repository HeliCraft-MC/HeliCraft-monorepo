import type { TaxCalculation, TaxCharge } from './contracts';
import { BASIS_POINTS, taxTotals } from './engine';
import { monetaryError } from '../monetary/domain';

const ACCRUAL_DENOMINATOR = BASIS_POINTS * BASIS_POINTS;
type Allocation = TaxCharge['allocations'][number];
interface AccrualIdentity {
  readonly key: string;
  readonly taxpayerId: string;
  readonly currencyId: string;
  readonly obligationKey: string;
  readonly creditorStateId: string;
  readonly beneficiaryKind: 'TREASURY' | 'CENTRAL_BANK';
  readonly beneficiaryId: string;
}
function accrualIdentity(
  calculation: TaxCalculation,
  charge: TaxCharge,
  allocation: Allocation,
): AccrualIdentity {
  const taxpayerId =
    charge.taxpayer === 'RECIPIENT' ? calculation.recipientId : calculation.senderId;
  const [claim] = charge.claims;
  if (!claim) {
    throw new Error('Tax claim required');
  }
  const obligationKey =
    charge.mode === 'SHARED' ? `treaty:${charge.treatyId}` : `law:${claim.lawId}`;
  const beneficiaryKind = allocation.beneficiary?.kind ?? 'TREASURY';
  const beneficiaryId = allocation.beneficiary?.ownerId ?? allocation.stateId;
  return {
    key: [
      taxpayerId,
      calculation.currencyId,
      obligationKey,
      allocation.stateId,
      beneficiaryKind,
      beneficiaryId,
    ].join(':'),
    taxpayerId,
    currencyId: calculation.currencyId,
    obligationKey,
    creditorStateId: allocation.stateId,
    beneficiaryKind,
    beneficiaryId,
  };
}
function exactAllocationNumerator(
  calculation: TaxCalculation,
  charge: TaxCharge,
  allocation: Allocation,
): bigint {
  if (charge.exempt === true) {
    return 0n;
  }
  const base = BigInt(charge.baseMinor ?? calculation.principalMinor);
  return base * BigInt(charge.rateBps) * BigInt(allocation.shareBps);
}
function accrueAllocation(
  allocation: Allocation,
  context: Readonly<{
    calculation: TaxCalculation;
    charge: TaxCharge;
    remainders: ReadonlyMap<string, string>;
  }>,
): Allocation {
  const { calculation, charge, remainders } = context;
  const { key } = accrualIdentity(calculation, charge, allocation);
  const previous = BigInt(remainders.get(key) ?? '0');
  if (previous < 0n || previous >= ACCRUAL_DENOMINATOR) {
    monetaryError('TAX_ACCRUAL_INTEGRITY', 'Некорректный накопленный налоговый остаток');
  }
  const exact = exactAllocationNumerator(calculation, charge, allocation);
  const accumulated = previous + exact;
  return {
    ...allocation,
    amountMinor: (accumulated / ACCRUAL_DENOMINATOR).toString(),
    accrual: {
      key,
      denominator: '100000000',
      exactNumerator: exact.toString(),
      remainderBefore: previous.toString(),
      remainderAfter: (accumulated % ACCRUAL_DENOMINATOR).toString(),
    },
  };
}
function accrueTaxes(
  calculation: TaxCalculation,
  remainders: ReadonlyMap<string, string>,
): TaxCalculation {
  const charges = calculation.charges.map((charge): TaxCharge => {
    const allocations = charge.allocations.map((allocation) =>
      accrueAllocation(allocation, { calculation, charge, remainders }),
    );
    return {
      ...charge,
      allocations,
      amountMinor: allocations
        .reduce((sum, allocation) => sum + BigInt(allocation.amountMinor), 0n)
        .toString(),
    };
  });
  return { ...calculation, charges, ...taxTotals(BigInt(calculation.principalMinor), charges) };
}
export { ACCRUAL_DENOMINATOR, accrualIdentity, exactAllocationNumerator, accrueTaxes };
