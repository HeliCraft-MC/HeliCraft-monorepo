import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { monetaryDirectives } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveDetail, DirectivePayload, MonetaryActor } from './contracts';
import { directiveContext } from './directive-context';

async function stateDirectivePage(
  transaction: Transaction,
  input: Readonly<{
    stateId: string;
    actor: MonetaryActor;
    page: number;
    pageSize: number;
    kinds: readonly DirectivePayload['kind'][];
  }>,
): Promise<{ items: DirectiveDetail[]; hasMore: boolean }> {
  const rows = await transaction
    .select({ id: monetaryDirectives.id })
    .from(monetaryDirectives)
    .where(
      and(
        eq(monetaryDirectives.stateId, input.stateId),
        inArray(sql<string>`${monetaryDirectives.payload}->>'kind'`, input.kinds),
      ),
    )
    .orderBy(desc(monetaryDirectives.createdAt), desc(monetaryDirectives.id))
    .limit(input.pageSize + 1)
    .offset((input.page - 1) * input.pageSize);
  const items: DirectiveDetail[] = [];
  for (const row of rows.slice(0, input.pageSize)) {
    // oxlint-disable-next-line no-await-in-loop -- Each bounded, already-authorized state page reads current Governance evidence on one transaction connection; filtering precedes pagination.
    const context = await directiveContext(transaction, row.id, input.actor);
    items.push(context.detail);
  }
  return { items, hasMore: rows.length > input.pageSize };
}
export { stateDirectivePage };
