import { publishInitialPolicies } from './institution-policies';
// oxlint-disable import/max-dependencies -- Approved economic directives dispatch to existing ledger or institution/law/treaty domain services.
import { TaxDirectiveSchema } from '../taxation/contracts';
import { TreatyDirectiveSchema } from '../diplomacy/contracts';
import { executeTaxDirective } from '../taxation/laws';
import { executeTreatyDirective } from '../diplomacy/execute';
import { CompanyStateDirectiveSchema } from '../companies/registration-contracts';
import { executeCompanyStateDirective } from '../companies/state-directives';
import { FxDirectiveSchema } from '../fx/contracts';
import { executeFxDirective } from '../fx/directives';
import { eq, sql } from 'drizzle-orm';
import { monetaryDirectives } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { MonetaryActor } from './contracts';
import { directiveContext, assertPending } from './directive-context';
import { monetaryAudit } from './store';
import { monetaryError } from './domain';
import { executeBankDirective } from './bank-execution';

// oxlint-disable-next-line max-statements -- Approved institution changes or postings and final directive status commit atomically.
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
  const company = CompanyStateDirectiveSchema.safeParse(payload);
  const fx = FxDirectiveSchema.safeParse(payload);
  if (fx.success) {
    await executeFxDirective(transaction, { record, actorId: actor.id }, fx.data);
  } else if (company.success) {
    await executeCompanyStateDirective(transaction, { record, actorId: actor.id }, company.data);
  } else if (tax.success) {
    await executeTaxDirective(transaction, record, tax.data);
  } else if (treaty.success) {
    await executeTreatyDirective(transaction, record, treaty.data);
  } else {
    await executeBankDirective(transaction, { record, payload, actorId: actor.id });
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
