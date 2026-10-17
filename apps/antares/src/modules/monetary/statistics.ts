import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { centralBanks, ledgerTransactions, monetaryPolicyRevisions, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { CurrencyRecord } from './store';
import type { MonetaryPolicy } from './contracts';
import { issuanceCapacity } from './capacity';

type PolicyRecord = typeof monetaryPolicyRevisions.$inferSelect;
interface PolicyRevisionView {
  readonly id: string;
  readonly number: number;
  readonly directiveId: string;
  readonly createdAt: string;
  readonly limits: MonetaryPolicy;
}
const PAGE_SIZE = 50;
async function grossIssuance30d(transaction: Transaction, currencyId: string): Promise<bigint> {
  const [gross] = await transaction
    .select({ total: sql<string>`coalesce(sum(${ledgerTransactions.amountMinor}), 0)::text` })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.currencyId, currencyId),
        eq(ledgerTransactions.kind, 'ISSUE'),
        gte(ledgerTransactions.createdAt, sql`clock_timestamp() - interval '30 days'`),
      ),
    );
  return BigInt(gross?.total ?? '0');
}
function policyView(record: PolicyRecord): PolicyRevisionView {
  return {
    id: record.id,
    number: record.number,
    directiveId: record.directiveId,
    createdAt: record.createdAt.toISOString(),
    limits: record.limits,
  };
}
async function monetaryStatistics(
  transaction: Transaction,
  currency: CurrencyRecord,
  policy: PolicyRecord | null,
): Promise<{
  grossIssuance30dMinor: string;
  availableIssuanceMinor: string;
  remainingIssuanceMinor: string;
  policy: PolicyRevisionView | null;
}> {
  const gross = await grossIssuance30d(transaction, currency.id);
  const [state] = await transaction
    .select({ status: states.status })
    .from(states)
    .where(eq(states.id, currency.stateId));
  const [bank] = await transaction
    .select({ status: centralBanks.status })
    .from(centralBanks)
    .where(eq(centralBanks.id, currency.bankId));
  const active =
    currency.status === 'ACTIVE' && state?.status === 'ACTIVE' && bank?.status === 'ACTIVE';
  const available = active
    ? issuanceCapacity(policy?.limits ?? null, { supply: BigInt(currency.supplyMinor), gross })
    : 0n;
  const remaining = active
    ? issuanceCapacity(
        policy === null ? null : { ...policy.limits, maxIssuancePerOperationMinor: null },
        { supply: BigInt(currency.supplyMinor), gross },
      )
    : 0n;
  return {
    remainingIssuanceMinor: remaining.toString(),
    grossIssuance30dMinor: gross.toString(),
    availableIssuanceMinor: available.toString(),
    policy: policy === null ? null : policyView(policy),
  };
}
async function policyHistory(
  transaction: Transaction,
  currencyId: string,
  page: number,
): Promise<PolicyRevisionView[]> {
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await transaction
    .select()
    .from(monetaryPolicyRevisions)
    .where(eq(monetaryPolicyRevisions.currencyId, currencyId))
    .orderBy(desc(monetaryPolicyRevisions.number))
    .limit(PAGE_SIZE + 1)
    .offset(offset);
  return rows.map((row) => policyView(row));
}
export { grossIssuance30d, monetaryStatistics, policyHistory, type PolicyRevisionView };
