// oxlint-disable no-await-in-loop -- Immutable law and treaty revisions hydrate sequentially on one locked connection.
import { and, desc, eq, inArray, lte, ne } from 'drizzle-orm';
import { taxLawRevisions, taxLaws, treaties, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readRevision } from '../states/revisions';
import { readText } from '../localized-content/service';
import { parties, treatyRevision } from '../diplomacy/store';
import type { WalletTransfer } from '../monetary/contracts';
import type { TaxClaim, TaxCalculation } from './contracts';
import { calculateTaxes, percentage } from './engine';
import type { ApplicableTreaty } from './engine';
import { jurisdictionMemberships, resolveJurisdiction } from './jurisdiction';
import { taxBaseMinor } from './rule';
import { taxBeneficiary } from './beneficiary';

async function applicableTreaties(
  transaction: Transaction,
  now: Date,
): Promise<ApplicableTreaty[]> {
  const records = await transaction
    .select()
    .from(treaties)
    .where(ne(treaties.status, 'TERMINATED'));
  const result: ApplicableTreaty[] = [];
  for (const record of records) {
    if (record.activeRevisionId !== null) {
      const revision = await treatyRevision(transaction, record.activeRevisionId);
      const { content } = revision;
      if (
        new Date(content.effectiveAt) <= now &&
        (content.expiresAt === null || new Date(content.expiresAt) > now)
      ) {
        const participants = await parties(transaction, record.id);
        const active = await transaction
          .select({ id: states.id })
          .from(states)
          .where(and(inArray(states.id, participants), eq(states.status, 'ACTIVE')));
        if (active.length === participants.length) {
          result.push({ id: record.id, revisionId: revision.id, parties: participants, content });
        }
      }
    }
  }
  return result;
}
// oxlint-disable-next-line max-lines-per-function -- The verified event reads each effective law once and retains exact jurisdiction evidence.
async function transferCalculation(
  transaction: Transaction,
  senderId: string,
  input: WalletTransfer,
): Promise<TaxCalculation> {
  const now = new Date();
  const memberships = await jurisdictionMemberships(transaction, senderId);
  const recipientMemberships = await jurisdictionMemberships(transaction, input.recipientId);
  const revisions = await transaction
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
  const seen = new Set<string>();
  const claims: TaxClaim[] = [];
  for (const { revision, stateId, stateRevisionId, stateSlug } of revisions) {
    if (!seen.has(revision.lawId)) {
      seen.add(revision.lawId);
      const { rule } = revision;
      const evidence = resolveJurisdiction(
        stateId,
        rule,
        rule.taxpayer === 'RECIPIENT' ? recipientMemberships : memberships,
      );
      if (
        revision.status === 'ACTIVE' &&
        evidence.length > 0 &&
        (rule.currencyIds.length === 0 || rule.currencyIds.includes(input.currencyId))
      ) {
        const state =
          stateRevisionId === null ? null : await readRevision(transaction, stateRevisionId);
        claims.push({
          stateName: state?.configuration.name ?? {},
          stateSlug,
          lawId: revision.lawId,
          revisionId: revision.id,
          revision: revision.number,
          stateId,
          name: await readText(transaction, revision.nameTextId),
          category: rule.category,
          taxpayer: rule.taxpayer,
          baseMinor: taxBaseMinor(BigInt(input.amountMinor), rule).toString(),
          beneficiary: await taxBeneficiary(transaction, stateId, rule),
          rateBps: rule.rateBps,
          evidence,
          nationalAmountMinor: percentage(
            taxBaseMinor(BigInt(input.amountMinor), rule),
            rule.rateBps,
          ).toString(),
        });
      }
    }
  }
  return calculateTaxes(
    {
      event: 'PLAYER_TRANSFER',
      senderId,
      recipientId: input.recipientId,
      currencyId: input.currencyId,
      principalMinor: input.amountMinor,
    },
    claims,
    await applicableTreaties(transaction, now),
  );
}
export { transferCalculation, applicableTreaties };
