import { and, eq, inArray, ne } from 'drizzle-orm';
import { treaties, treatyParties, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import type { TreatyDirective, TreatyContent } from './contracts';
import { treatyRecord, treatyRevision, parties } from './store';
import { overlappingTreatyClaims } from './category-scope';

function assertOfferNotExpired(payload: TreatyDirective, expiry: string | null): void {
  if (
    payload.kind !== 'DENOUNCE_TREATY' &&
    expiry !== null &&
    new Date(expiry).getTime() <= Date.now()
  ) {
    monetaryError('TREATY_EXPIRED', 'Срок предложенного договора уже истёк');
  }
}
async function assertTreatyDirective(
  transaction: Transaction,
  stateId: string,
  payload: TreatyDirective,
): Promise<void> {
  const record = await treatyRecord(transaction, payload.treatyId);
  const revision = await treatyRevision(transaction, payload.revisionId);
  assertOfferNotExpired(payload, revision.content.expiresAt);
  const participants = await parties(transaction, record.id);
  const expected =
    payload.kind === 'DENOUNCE_TREATY' ? record.activeRevisionId : record.currentRevisionId;
  if (
    !participants.includes(stateId) ||
    revision.treatyId !== record.id ||
    expected !== revision.id ||
    revision.contentHash !== payload.contentHash
  ) {
    monetaryError(
      'TREATY_REVISION_MISMATCH',
      'Требуется одна и та же редакция договора и собственное государственное полномочие',
    );
  }
  if (
    (payload.kind === 'RATIFY_TREATY' && record.activeRevisionId !== null) ||
    (payload.kind === 'AMEND_TREATY' && record.activeRevisionId === null)
  ) {
    monetaryError(
      'TREATY_ACTION_MISMATCH',
      'Изменение действующего договора требует отдельного полномочия',
    );
  }
  const active = await transaction
    .select({ id: states.id })
    .from(states)
    .where(and(inArray(states.id, participants), eq(states.status, 'ACTIVE')));
  if (
    active.length !== participants.length ||
    record.status === 'TERMINATED' ||
    (payload.kind !== 'DENOUNCE_TREATY' && record.status !== 'PROPOSED') ||
    (payload.kind === 'DENOUNCE_TREATY' && record.activeRevisionId === null)
  ) {
    monetaryError(
      'TREATY_NOT_PROPOSED',
      'Договор не ожидает этого решения или государство недоступно',
    );
  }
}
function windowsOverlap(left: TreatyContent, right: TreatyContent): boolean {
  const leftEnd = left.expiresAt === null ? Infinity : new Date(left.expiresAt).getTime();
  const rightEnd = right.expiresAt === null ? Infinity : new Date(right.expiresAt).getTime();
  return (
    new Date(left.effectiveAt).getTime() < rightEnd &&
    new Date(right.effectiveAt).getTime() < leftEnd
  );
}
async function assertTreatyConflicts(
  transaction: Transaction,
  id: string,
  content: TreatyContent,
): Promise<void> {
  const participants = await parties(transaction, id);
  const overlaps = await transaction
    .selectDistinct({ treaty: treaties })
    .from(treaties)
    .innerJoin(treatyParties, eq(treatyParties.treatyId, treaties.id))
    .where(
      and(
        ne(treaties.id, id),
        inArray(treatyParties.stateId, participants),
        ne(treaties.status, 'TERMINATED'),
      ),
    );
  for (const row of overlaps) {
    if (row.treaty.activeRevisionId !== null) {
      // oxlint-disable-next-line no-await-in-loop -- Prospective active revisions hydrate on the locked transaction connection.
      const revision = await treatyRevision(transaction, row.treaty.activeRevisionId);
      // oxlint-disable-next-line no-await-in-loop -- Immutable party order defines each side of the ratified category mapping.
      const otherParticipants = await parties(transaction, row.treaty.id);
      if (
        overlappingTreatyClaims(
          { content, parties: participants },
          { content: revision.content, parties: otherParticipants },
        ) &&
        windowsOverlap(content, revision.content)
      ) {
        monetaryError(
          'TREATY_CONFLICT',
          'Другой действующий договор охватывает налоговые требования одной из сторон в этот период',
        );
      }
    }
  }
}
export { assertTreatyDirective, assertTreatyConflicts, windowsOverlap };
