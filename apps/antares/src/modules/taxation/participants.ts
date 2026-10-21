import { z } from '@hono/zod-openapi';
import type { TaxCalculation, TaxEvent } from './contracts';

const FinancialPartySchema = z
  .object({ kind: z.enum(['PLAYER', 'COMPANY']), id: z.uuid() })
  .strict()
  .openapi('FinancialParty');
type FinancialParty = z.infer<typeof FinancialPartySchema>;
interface FinancialTransfer {
  readonly sender: FinancialParty;
  readonly recipient: FinancialParty;
  readonly currencyId: string;
  readonly amountMinor: string;
  readonly purpose: string;
  readonly sourceBranchId?: string;
}
function transferEvent(sender: FinancialParty, recipient: FinancialParty): TaxEvent {
  if (sender.kind === 'PLAYER') {
    return recipient.kind === 'PLAYER' ? 'PLAYER_TRANSFER' : 'PLAYER_COMPANY_TRANSFER';
  }
  return recipient.kind === 'PLAYER' ? 'COMPANY_PLAYER_TRANSFER' : 'COMPANY_TRANSFER';
}
function calculationParty(
  calculation: TaxCalculation,
  role: 'SENDER' | 'RECIPIENT',
): FinancialParty {
  return role === 'SENDER'
    ? { kind: calculation.senderKind ?? 'PLAYER', id: calculation.senderId }
    : { kind: calculation.recipientKind ?? 'PLAYER', id: calculation.recipientId };
}
export {
  FinancialPartySchema,
  transferEvent,
  calculationParty,
  type FinancialParty,
  type FinancialTransfer,
};
