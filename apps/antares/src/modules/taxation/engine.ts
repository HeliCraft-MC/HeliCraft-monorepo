import type { TreatyContent } from '../diplomacy/contracts';
import { MAX_MINOR, monetaryError } from '../monetary/domain';
import type { TaxCalculation, TaxClaim, TaxCharge } from './contracts';

const BASIS_POINTS = 10_000n;
interface ApplicableTreaty {
  readonly id: string;
  readonly revisionId: string;
  readonly parties: readonly [string, string];
  readonly content: TreatyContent;
}
function percentage(base: bigint, bps: number): bigint {
  if (
    base < 0n ||
    base > MAX_MINOR ||
    !Number.isInteger(bps) ||
    bps < 0 ||
    BigInt(bps) > BASIS_POINTS
  ) {
    monetaryError('TAX_RANGE', 'Налоговая база или ставка вне допустимого диапазона');
  }
  return (base * BigInt(bps)) / BASIS_POINTS;
}
function nationalCharge(claim: TaxClaim): TaxCharge {
  return {
    key: `law:${claim.lawId}`,
    taxpayer: claim.taxpayer ?? 'SENDER',
    claims: [claim],
    treatyId: null,
    treatyRevisionId: null,
    treatyName: {},
    mode: 'NATIONAL',
    rateBps: claim.rateBps,
    amountMinor: claim.nationalAmountMinor,
    allocations: [
      {
        stateId: claim.stateId,
        beneficiary: claim.beneficiary,
        shareBps: Number(BASIS_POINTS),
        amountMinor: claim.nationalAmountMinor,
      },
    ],
  };
}
function sharedBeneficiary(
  claims: readonly TaxClaim[],
  stateId: string,
): TaxClaim['beneficiary'] {
  const national = claims.filter((claim) => claim.stateId === stateId);
  const [first] = national;
  if (
    national.some(
      (claim) =>
        (claim.beneficiary?.kind ?? 'TREASURY') !== (first?.beneficiary?.kind ?? 'TREASURY') ||
        (claim.beneficiary?.ownerId ?? stateId) !== (first?.beneficiary?.ownerId ?? stateId),
    )
  ) {
    monetaryError(
      'TREATY_BENEFICIARY_CONFLICT',
      'Общее налоговое требование имеет несовместимых получателей. Требуется изменение законов или договора',
    );
  }
  return first?.beneficiary;
}
function sharedCharge(base: bigint, treaty: ApplicableTreaty, claims: TaxClaim[]): TaxCharge {
  const { terms } = treaty.content;
  if (terms.mode !== 'SHARED') {
    throw new Error('Shared treaty required');
  }
  const amount = percentage(base, terms.rateBps);
  const first = (amount * BigInt(terms.firstShareBps)) / BASIS_POINTS;
  return {
    key: `treaty:${treaty.revisionId}:${treaty.content.category}:${claims[0]?.taxpayer ?? 'SENDER'}`,
    taxpayer: claims[0]?.taxpayer ?? 'SENDER',
    claims,
    treatyId: treaty.id,
    treatyRevisionId: treaty.revisionId,
    treatyName: treaty.content.name,
    mode: 'SHARED',
    rateBps: terms.rateBps,
    amountMinor: amount.toString(),
    allocations: [
      {
        stateId: treaty.parties[0],
        beneficiary: sharedBeneficiary(claims, treaty.parties[0]),
        shareBps: terms.firstShareBps,
        amountMinor: first.toString(),
      },
      {
        stateId: treaty.parties[1],
        beneficiary: sharedBeneficiary(claims, treaty.parties[1]),
        shareBps: Number(BASIS_POINTS) - terms.firstShareBps,
        amountMinor: (amount - first).toString(),
      },
    ],
  };
}
function exclusiveCharges(treaty: ApplicableTreaty, claims: TaxClaim[]): TaxCharge[] {
  const { terms } = treaty.content;
  if (terms.mode !== 'EXCLUSIVE') {
    throw new Error('Exclusive treaty required');
  }
  return claims.map((claim) => {
    const charge = nationalCharge(claim);
    const amount = claim.stateId === terms.taxingStateId ? claim.nationalAmountMinor : '0';
    return {
      ...charge,
      treatyId: treaty.id,
      treatyRevisionId: treaty.revisionId,
      treatyName: treaty.content.name,
      mode: 'EXCLUSIVE',
      amountMinor: amount,
      allocations: charge.allocations.map((allocation) => ({ ...allocation, amountMinor: amount })),
    };
  });
}
// oxlint-disable-next-line max-lines-per-function -- Deterministic treaty replacement retains every original law and rejects overlapping obligations.
function calculateTaxes(
  event: Readonly<Omit<TaxCalculation, 'charges' | 'totalTaxMinor' | 'totalDebitMinor'>>,
  inputClaims: readonly TaxClaim[],
  treaties: readonly ApplicableTreaty[],
): TaxCalculation {
  const base = BigInt(event.principalMinor);
  if (base <= 0n || base > MAX_MINOR) {
    monetaryError('TAX_RANGE', 'Сумма перевода вне допустимого диапазона');
  }
  // oxlint-disable-next-line unicorn/no-array-sort -- Sort a fresh snapshot using the repository ES2022 target.
  const claims = [...new Map(inputClaims.map((claim) => [claim.lawId, claim])).values()].sort(
    (left, right) => left.lawId.localeCompare(right.lawId),
  );
  const touched = new Set<string>();
  const charges: TaxCharge[] = [];
  // oxlint-disable-next-line unicorn/no-array-sort -- Sort a copied input without mutating caller data on ES2022.
  for (const treaty of [...treaties].sort((left, right) => left.id.localeCompare(right.id))) {
    for (const taxpayer of ['SENDER', 'RECIPIENT']) {
      const covered = claims.filter(
        (claim) =>
          (claim.taxpayer ?? 'SENDER') === taxpayer &&
          treaty.parties.includes(claim.stateId) &&
          claim.category === treaty.content.category,
      );
      if (!treaty.parties.every((stateId) => covered.some((claim) => claim.stateId === stateId))) {
        continue;
      }
      if (covered.some((claim) => touched.has(claim.lawId))) {
        monetaryError(
          'TREATY_CONFLICT',
          'Налоговые договоры противоречат друг другу. Перевод не исполнен',
        );
      }
      for (const claim of covered) {
        touched.add(claim.lawId);
      }
      charges.push(
        ...(treaty.content.terms.mode === 'SHARED'
          ? [sharedCharge(base, treaty, covered)]
          : exclusiveCharges(treaty, covered)),
      );
    }
  }
  charges.push(
    ...claims.filter((claim) => !touched.has(claim.lawId)).map((claim) => nationalCharge(claim)),
  );
  charges.sort((left, right) => left.key.localeCompare(right.key));
  const totalTax = charges.reduce((sum, charge) => sum + BigInt(charge.amountMinor), 0n);
  const recipientTax = charges
    .filter((charge) => charge.taxpayer === 'RECIPIENT')
    .reduce((sum, charge) => sum + BigInt(charge.amountMinor), 0n);
  const totalDebit = base + totalTax - recipientTax;
  if (recipientTax > base) {
    monetaryError('TAX_WITHHOLDING_EXCEEDS_PRINCIPAL', 'Налоги получателя превышают сумму перевода');
  }
  if (totalDebit > MAX_MINOR) {
    monetaryError('TAX_OVERFLOW', 'Общая сумма перевода с налогами превышает допустимый диапазон');
  }
  return {
    ...event,
    charges,
    totalTaxMinor: totalTax.toString(),
    totalDebitMinor: totalDebit.toString(),
    recipientCreditMinor: (base - recipientTax).toString(),
  };
}
export { percentage, calculateTaxes, BASIS_POINTS, type ApplicableTreaty };
