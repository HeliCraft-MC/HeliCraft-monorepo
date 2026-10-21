import { eq } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import { centralBanks, fxOffers } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { fxCurrency, fxBankIdentity } from './display';
import { FxDirectiveSchema } from './contracts';
import type { FxDecisionDisplaySchema, FxDirective } from './contracts';
import type { DirectivePayload } from '../monetary/contracts';

async function offerDecisionDisplay(
  transaction: Transaction,
  bankId: string,
  payload: Exclude<FxDirective, { kind: 'APPROVE_INTERBANK_EXCHANGE' }>,
): Promise<z.infer<typeof FxDecisionDisplaySchema>> {
  if (payload.kind === 'PUBLISH_FX_OFFER') {
    return {
      currencies: [
        await fxCurrency(transaction, payload.terms.receiveCurrencyId),
        await fxCurrency(transaction, payload.terms.provideCurrencyId),
      ],
      banks: [await fxBankIdentity(transaction, bankId)],
    };
  }
  const [offer] = await transaction.select().from(fxOffers).where(eq(fxOffers.id, payload.offerId));
  if (!offer) {
    throw new Error('FX decision offer missing');
  }
  return {
    currencies: [
      await fxCurrency(transaction, offer.receiveCurrencyId),
      await fxCurrency(transaction, offer.provideCurrencyId),
    ],
    banks: [await fxBankIdentity(transaction, bankId)],
  };
}
async function fxDecisionDisplay(
  transaction: Transaction,
  stateId: string,
  payload: DirectivePayload,
): Promise<z.infer<typeof FxDecisionDisplaySchema> | undefined> {
  const parsed = FxDirectiveSchema.safeParse(payload);
  if (!parsed.success) {
    return undefined;
  }
  if (parsed.data.kind === 'APPROVE_INTERBANK_EXCHANGE') {
    const { terms } = parsed.data;
    return {
      currencies: [
        await fxCurrency(transaction, terms.first.currencyId),
        await fxCurrency(transaction, terms.second.currencyId),
      ],
      banks: [
        await fxBankIdentity(transaction, terms.first.bankId),
        await fxBankIdentity(transaction, terms.second.bankId),
      ],
    };
  }
  const [bank] = await transaction
    .select({ id: centralBanks.id })
    .from(centralBanks)
    .where(eq(centralBanks.stateId, stateId));
  if (!bank) {
    throw new Error('FX decision bank missing');
  }
  return await offerDecisionDisplay(transaction, bank.id, parsed.data);
}
export { fxDecisionDisplay };
