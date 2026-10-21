import { eq, sql } from 'drizzle-orm';
import { centralBanks, currencies, monetaryPolicyRevisions } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from './store';
import { assertBankCurrency, currentPolicy } from './store';
import type { DirectivePayload } from './contracts';
import { executeFinancial, account } from './ledger';

// oxlint-disable-next-line max-lines-per-function -- A bank directive creates its institution, currency/accounts or exact financial result in one transaction.
async function executeBankDirective(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string; payload: DirectivePayload }>,
): Promise<void> {
  const { record, payload, actorId } = input;
  const { id } = record;
  const { bank, currency } = await assertBankCurrency(transaction, record.stateId, payload);
  if (payload.kind === 'ESTABLISH_BANK') {
    // oxlint-disable-next-line unicorn/prefer-ternary -- Separate insert and update chains make the institution transition explicit.
    if (bank === null) {
      await transaction.insert(centralBanks).values({
        stateId: record.stateId,
        establishmentDirectiveId: id,
        charterDirectiveId: id,
      });
    } else {
      await transaction
        .update(centralBanks)
        .set({ status: 'PENDING', establishmentDirectiveId: id, charterDirectiveId: id })
        .where(eq(centralBanks.id, bank.id));
    }
  } else if (payload.kind === 'CHANGE_CHARTER' && bank !== null) {
    await transaction
      .update(centralBanks)
      .set({ charterDirectiveId: id })
      .where(eq(centralBanks.id, bank.id));
  } else if (payload.kind === 'CREATE_CURRENCY' && bank !== null) {
    const currencyId = crypto.randomUUID();
    await transaction.insert(currencies).values({
      id: currencyId,
      stateId: record.stateId,
      bankId: bank.id,
      directiveId: id,
      code: payload.code,
    });
    await account(transaction, { currencyId, kind: 'ISSUANCE', ownerId: currencyId });
    await account(transaction, { currencyId, kind: 'CENTRAL_BANK', ownerId: bank.id });
    await account(transaction, { currencyId, kind: 'TREASURY', ownerId: record.stateId });
  } else if (payload.kind === 'CHANGE_POLICY' && currency !== null) {
    const previousPolicy = await currentPolicy(transaction, currency.id);
    await transaction.insert(monetaryPolicyRevisions).values({
      currencyId: currency.id,
      directiveId: id,
      limits: payload.policy,
      number: (previousPolicy?.number ?? 0) + 1,
      createdAt: sql`clock_timestamp()`,
    });
  } else if (currency === null) {
    throw new Error('Invalid monetary operation');
  } else {
    if (!('amountMinor' in payload)) {
      throw new Error('Financial payload required');
    }
    await executeFinancial(transaction, { record, payload, currency, actorId });
  }
}
export { executeBankDirective };
