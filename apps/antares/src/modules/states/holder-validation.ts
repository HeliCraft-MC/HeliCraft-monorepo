import { and, eq, isNull } from 'drizzle-orm';
import { stateMemberships, users, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { readRevision } from './revisions';
import type { StateConfiguration, Issue } from './contracts';

// oxlint-disable-next-line max-lines-per-function -- Initial roster retention and active-citizen validation share one state snapshot.
async function holderValidation(
  transaction: Transaction,
  configuration: StateConfiguration,
  stateId: string | null,
): Promise<{ allowedIds: string[] | undefined; issues: Issue[] }> {
  if (stateId === null) {
    return { allowedIds: undefined, issues: [] };
  }
  const people = await transaction
    .select({ id: stateMemberships.userId })
    .from(stateMemberships)
    .innerJoin(users, eq(users.id, stateMemberships.userId))
    .where(
      and(
        eq(stateMemberships.stateId, stateId),
        isNull(stateMemberships.endedAt),
        eq(users.status, 'ACTIVE'),
      ),
    );
  const active = new Set(people.map((person) => person.id));
  const [state] = await transaction
    .select({ currentRevisionId: states.currentRevisionId })
    .from(states)
    .where(eq(states.id, stateId))
    .for('update');
  if (state === undefined) {
    throw new DomainError(HTTP.notFound, 'STATE_NOT_FOUND', 'Государство не найдено');
  }
  const previous =
    state.currentRevisionId === null
      ? null
      : await readRevision(transaction, state.currentRevisionId);
  const retained: string[] = [];
  const issues: Issue[] = [];
  for (const office of configuration.governance.offices) {
    const old = previous?.configuration.governance.offices.find((item) => item.id === office.id);
    if (
      old !== undefined &&
      JSON.stringify(old.initialHolderIds) === JSON.stringify(office.initialHolderIds)
    ) {
      retained.push(...office.initialHolderIds);
    } else if (office.initialHolderIds.some((id) => !active.has(id))) {
      issues.push({
        path: `governance.offices.${office.id}.initialHolderIds`,
        severity: 'ERROR',
        message: 'Новые назначения выбираются среди действующих граждан с активными аккаунтами',
      });
    }
  }
  return { allowedIds: [...active, ...retained], issues };
}
export { holderValidation };
