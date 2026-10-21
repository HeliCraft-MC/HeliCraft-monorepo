// oxlint-disable no-await-in-loop -- Immutable law and treaty revisions hydrate sequentially on one locked connection.
import { and, eq, inArray, ne } from 'drizzle-orm';
import { treaties, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { parties, treatyRevision } from '../diplomacy/store';
import type { WalletTransfer } from '../monetary/contracts';
import type { TaxCalculation } from './contracts';
import { calculateTaxes } from './engine';
import type { ApplicableTreaty } from './engine';
import { accruedCalculation } from './accrual-store';
import { nationalTransferClaims } from './national-claims';
import { transferEvent } from './participants';
import type { FinancialTransfer } from './participants';

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
async function financialTransferCalculation(
  transaction: Transaction,
  input: FinancialTransfer,
): Promise<TaxCalculation> {
  const now = new Date();
  const claims = await nationalTransferClaims(transaction, input, now);
  const calculation = calculateTaxes(
    {
      event: transferEvent(input.sender, input.recipient),
      senderId: input.sender.id,
      senderKind: input.sender.kind,
      recipientId: input.recipient.id,
      recipientKind: input.recipient.kind,
      currencyId: input.currencyId,
      principalMinor: input.amountMinor,
      ...(input.sourceBranchId === undefined ? {} : { sourceBranchId: input.sourceBranchId }),
    },
    claims,
    await applicableTreaties(transaction, now),
  );
  return await accruedCalculation(transaction, calculation);
}
async function transferCalculation(
  transaction: Transaction,
  senderId: string,
  input: WalletTransfer,
): Promise<TaxCalculation> {
  return await financialTransferCalculation(transaction, {
    sender: { kind: 'PLAYER', id: senderId },
    recipient: { kind: input.recipientType ?? 'PLAYER', id: input.recipientId },
    currencyId: input.currencyId,
    amountMinor: input.amountMinor,
    purpose: input.purpose,
  });
}
export { transferCalculation, financialTransferCalculation, applicableTreaties };
