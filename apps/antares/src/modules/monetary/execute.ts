import { publishInitialPolicies } from './institution-policies';
// oxlint-disable import/max-dependencies -- Approved economic directives dispatch to existing ledger or institution/law/treaty domain services.
import { TaxDirectiveSchema } from '../taxation/contracts';
import { TreatyDirectiveSchema } from '../diplomacy/contracts';
import { executeTaxDirective } from '../taxation/laws';
import { executeTreatyDirective } from '../diplomacy/execute';
import { eq, sql } from 'drizzle-orm';
import {
  centralBanks,
  currencies,
  monetaryPolicyRevisions,
  monetaryDirectives,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { MonetaryActor } from './contracts';
import { directiveContext, assertPending, requireFinancialPayload } from './directive-context';
import { assertBankCurrency, monetaryAudit, currentPolicy } from './store';
import { monetaryError } from './domain';
import { executeFinancial, account } from './ledger';

// oxlint-disable-next-line max-lines-per-function, max-statements -- Approved institution changes or postings and final directive status commit atomically.
async function applyDirective(
  transaction: Transaction,
  input: Readonly<{ id: string; actor: MonetaryActor; reason?: string }>,
): Promise<void> {
  const { id, actor, reason = '' } = input;
  const { record, detail } = await directiveContext(transaction, id, actor);
  if (record.status === 'APPLIED') {
    return;
  }
  assertPending(detail);
  if (detail.executionProblem !== null) {
    monetaryError('MONETARY_NOT_EXECUTABLE', detail.executionProblem);
  }
  if (!detail.canApply || (detail.manualRequired && reason.trim() === '')) {
    monetaryError(
      'DIRECTIVE_NOT_APPROVED',
      'Требуются действующие полномочия, одобрения, успешное голосование и предусмотренная ручная проверка с обоснованием',
    );
  }
  const { payload } = detail;
  const tax = TaxDirectiveSchema.safeParse(payload);
  const treaty = TreatyDirectiveSchema.safeParse(payload);
  if (tax.success) {
    await executeTaxDirective(transaction, record, tax.data);
  } else if (treaty.success) {
    await executeTreatyDirective(transaction, record, treaty.data);
  } else {
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
      requireFinancialPayload(payload);
      await executeFinancial(transaction, { record, payload, currency, actorId: actor.id });
    }
  }
  await publishInitialPolicies(transaction, { record, actorId: actor.id }, payload);
  await transaction
    .update(monetaryDirectives)
    .set({ status: 'APPLIED', appliedAt: sql`clock_timestamp()` })
    .where(eq(monetaryDirectives.id, id));
  await monetaryAudit(transaction, {
    actorId: actor.id,
    id,
    action: 'monetary.directive.applied',
    reason,
  });
}
export { applyDirective };
