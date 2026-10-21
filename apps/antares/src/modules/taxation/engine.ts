import type { TreatyContent } from '../diplomacy/contracts';
import { MAX_MINOR, monetaryError } from '../monetary/domain';
import { treatyCategoryFor } from '../diplomacy/category-scope';
import type { TaxCalculation, TaxClaim, TaxCharge, TaxEvent } from './contracts';

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
    baseMinor: claim.baseMinor,
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
function sharedBeneficiary(claims: readonly TaxClaim[], stateId: string): TaxClaim['beneficiary'] {
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
    baseMinor: base.toString(),
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
      exempt: claim.stateId !== terms.taxingStateId,
      amountMinor: amount,
      allocations: charge.allocations.map((allocation) =>
        Object.assign(allocation, { amountMinor: amount }),
      ),
    };
  });
}
function treatyCharges(
  base: bigint,
  claims: readonly TaxClaim[],
  context: Readonly<{ treaties: readonly ApplicableTreaty[]; event: TaxEvent }>,
): TaxCharge[] {
  const touched = new Set<string>();
  const charges: TaxCharge[] = [];
  const ordered = [...context.treaties].filter(
    (candidate) => candidate.content.event === context.event,
  );
  ordered.sort((left, right) => left.id.localeCompare(right.id));
  for (const treaty of ordered) {
    for (const taxpayer of ['SENDER', 'RECIPIENT']) {
      const covered = claims.filter(
        (claim) =>
          (claim.taxpayer ?? 'SENDER') === taxpayer &&
          treaty.parties.includes(claim.stateId) &&
          claim.category === treatyCategoryFor(treaty, claim.stateId),
      );
      if (treaty.parties.every((stateId) => covered.some((claim) => claim.stateId === stateId))) {
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
  }
  charges.push(
    ...claims.filter((claim) => !touched.has(claim.lawId)).map((claim) => nationalCharge(claim)),
  );
  charges.sort((left, right) => left.key.localeCompare(right.key));
  return charges;
}
function taxTotals(
  base: bigint,
  charges: readonly TaxCharge[],
): Pick<TaxCalculation, 'totalTaxMinor' | 'totalDebitMinor' | 'recipientCreditMinor'> {
  const totalTax = charges.reduce((sum, charge) => sum + BigInt(charge.amountMinor), 0n);
  const recipientTax = charges
    .filter((charge) => charge.taxpayer === 'RECIPIENT')
    .reduce((sum, charge) => sum + BigInt(charge.amountMinor), 0n);
  const totalDebit = base + totalTax - recipientTax;
  if (recipientTax > base) {
    monetaryError(
      'TAX_WITHHOLDING_EXCEEDS_PRINCIPAL',
      'Налоги получателя превышают сумму перевода',
    );
  }
  if (totalDebit > MAX_MINOR) {
    monetaryError('TAX_OVERFLOW', 'Общая сумма перевода с налогами превышает допустимый диапазон');
  }
  return {
    totalTaxMinor: totalTax.toString(),
    totalDebitMinor: totalDebit.toString(),
    recipientCreditMinor: (base - recipientTax).toString(),
  };
}
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
  const charges = treatyCharges(base, claims, { treaties, event: event.event });
  return { ...event, charges, ...taxTotals(base, charges) };
}
export { percentage, calculateTaxes, taxTotals, BASIS_POINTS, type ApplicableTreaty };
