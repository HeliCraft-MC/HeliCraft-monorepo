// oxlint-disable import/max-dependencies -- National claims combine immutable laws, exact bases, legal-party jurisdiction and approved regime evidence.
// oxlint-disable no-await-in-loop -- Immutable law labels and legal evidence hydrate on one serialized financial transaction.
import { and, desc, eq, lte } from 'drizzle-orm';
import { taxLawRevisions, taxLaws, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readRevision } from '../states/revisions';
import { readText } from '../localized-content/service';
import type { TaxClaim } from './contracts';
import { percentage } from './engine';
import { taxBaseMinor } from './rule';
import { taxBeneficiary } from './beneficiary';
import { transferEvent } from './participants';
import type { FinancialTransfer } from './participants';
import { partyJurisdiction, resolvePartyJurisdiction } from './party-jurisdiction';
import { applyCompanyRegimes, ruleAppliesToEvent, ruleAppliesToTransfer } from './regimes';

interface CurrentNationalLaw {
  readonly id: string;
  readonly stateId: string;
  readonly stateRevisionId: string | null;
  readonly stateSlug: string | null;
  readonly rule: (typeof taxLawRevisions.$inferSelect)['rule'];
  readonly revision: typeof taxLawRevisions.$inferSelect;
}
async function effectiveNationalLaws(
  transaction: Transaction,
  now: Date,
): Promise<CurrentNationalLaw[]> {
  const rows = await transaction
    .select({
      revision: taxLawRevisions,
      stateId: taxLaws.stateId,
      stateRevisionId: states.currentRevisionId,
      stateSlug: states.slug,
    })
    .from(taxLawRevisions)
    .innerJoin(taxLaws, eq(taxLaws.id, taxLawRevisions.lawId))
    .innerJoin(states, eq(states.id, taxLaws.stateId))
    .where(and(eq(states.status, 'ACTIVE'), lte(taxLawRevisions.effectiveAt, now)))
    .orderBy(desc(taxLawRevisions.number));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.revision.lawId)) {
      latest.set(row.revision.lawId, row);
    }
  }
  return [...latest.values()]
    .filter((row) => row.revision.status === 'ACTIVE')
    .map((row) => ({
      revision: row.revision,
      stateId: row.stateId,
      stateRevisionId: row.stateRevisionId,
      stateSlug: row.stateSlug,
      id: row.revision.lawId,
      rule: row.revision.rule,
    }));
}
async function nationalClaimDto(
  transaction: Transaction,
  context: Readonly<{
    base: CurrentNationalLaw;
    applied: CurrentNationalLaw;
    transfer: FinancialTransfer;
    sender: Awaited<ReturnType<typeof partyJurisdiction>>;
    recipient: Awaited<ReturnType<typeof partyJurisdiction>>;
  }>,
): Promise<TaxClaim> {
  const { base, applied, transfer, sender, recipient } = context;
  const { rule, stateId } = applied;
  const state =
    applied.stateRevisionId === null
      ? null
      : await readRevision(transaction, applied.stateRevisionId);
  const rateBps = rule.regime?.mode === 'EXEMPT' ? 0 : rule.rateBps;
  const baseMinor = taxBaseMinor(BigInt(transfer.amountMinor), rule);
  return {
    lawId: base.id,
    revisionId: base.revision.id,
    revision: base.revision.number,
    stateId,
    stateName: state?.configuration.name ?? {},
    stateSlug: applied.stateSlug ?? '',
    name: await readText(transaction, applied.revision.nameTextId),
    category: rule.category,
    taxpayer: rule.taxpayer,
    baseMinor: baseMinor.toString(),
    beneficiary: await taxBeneficiary(transaction, stateId, rule),
    rateBps,
    evidence: resolvePartyJurisdiction(
      stateId,
      rule,
      rule.taxpayer === 'RECIPIENT' ? recipient : sender,
    ),
    nationalAmountMinor: percentage(baseMinor, rateBps).toString(),
    ...(rule.regime === undefined
      ? {}
      : {
          regime: { lawId: applied.id, revisionId: applied.revision.id, mode: rule.regime.mode },
        }),
  };
}
async function nationalTransferClaims(
  transaction: Transaction,
  input: FinancialTransfer,
  now: Date,
): Promise<TaxClaim[]> {
  const sender = await partyJurisdiction(transaction, input.sender, input.sourceBranchId);
  const recipient = await partyJurisdiction(transaction, input.recipient);
  const event = transferEvent(input.sender, input.recipient);
  const records = await effectiveNationalLaws(transaction, now);
  const eligible = records.filter(
    (row) =>
      ruleAppliesToEvent(row.rule, event) &&
      ruleAppliesToTransfer(row.rule, input) &&
      (row.rule.currencyIds.length === 0 || row.rule.currencyIds.includes(input.currencyId)) &&
      resolvePartyJurisdiction(
        row.stateId,
        row.rule,
        row.rule.taxpayer === 'RECIPIENT' ? recipient : sender,
      ).length > 0,
  );
  const claims: TaxClaim[] = [];
  for (const { base, applied } of applyCompanyRegimes(eligible)) {
    claims.push(
      await nationalClaimDto(transaction, { base, applied, transfer: input, sender, recipient }),
    );
  }
  return claims;
}
export { nationalTransferClaims };
