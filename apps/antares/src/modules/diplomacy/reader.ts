// oxlint-disable import/max-dependencies -- Treaty evidence combines current state identity, immutable content and independent Governance decisions.
// oxlint-disable no-await-in-loop -- Immutable treaty text and each party's independent evidence hydrate on the same transaction connection.
import { and, desc, eq, inArray, isNotNull, ne, or } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import {
  treaties,
  treatyParties,
  treatyRevisions,
  treatyDecisions,
  treatyActivations,
  states,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { directiveContext } from '../monetary/directive-context';
import { directiveRecord } from '../monetary/store';
import { readRevision } from '../states/revisions';
import { DomainError, HTTP } from '../errors';
import { renderMarkdown } from '../content/markdown';
import { resolveText } from '../localized-content/contracts';
import type { Locale } from '../localized-content/contracts';
import { treatyRevision } from './store';
import type { TreatySchema, PublicTreatySchema } from './read-contracts';

const HISTORY_LIMIT = 50;

async function treatyPartyDtos(
  transaction: Transaction,
  id: string,
): Promise<z.infer<typeof TreatySchema>['parties']> {
  const rows = await transaction
    .select({ state: states })
    .from(treatyParties)
    .innerJoin(states, eq(states.id, treatyParties.stateId))
    .where(eq(treatyParties.treatyId, id))
    .orderBy(treatyParties.position);
  const result: z.infer<typeof TreatySchema>['parties'] = [];
  for (const { state } of rows) {
    const revision =
      state.currentRevisionId === null
        ? null
        : await readRevision(transaction, state.currentRevisionId);
    result.push({
      id: state.id,
      slug: state.status === 'ACTIVE' ? state.slug : null,
      name: state.status === 'ACTIVE' ? (revision?.configuration.name ?? {}) : {},
      color: state.status === 'ACTIVE' ? (revision?.configuration.color ?? null) : null,
      flag:
        state.status === 'ACTIVE' && revision !== null
          ? { horizontal: revision.configuration.horizontalFlag }
          : null,
    });
  }
  return result;
}
// oxlint-disable-next-line max-lines-per-function -- One immutable treaty DTO includes bounded revisions and each independent party's current evidence.
async function treatyDto(
  transaction: Transaction,
  record: typeof treaties.$inferSelect,
): Promise<z.infer<typeof TreatySchema>> {
  const rows = await transaction
    .select()
    .from(treatyRevisions)
    .where(eq(treatyRevisions.treatyId, record.id))
    .orderBy(desc(treatyRevisions.number))
    .limit(HISTORY_LIMIT);
  if (record.activeRevisionId !== null && !rows.some((row) => row.id === record.activeRevisionId)) {
    rows.push(await treatyRevision(transaction, record.activeRevisionId));
  }
  const revisions: z.infer<typeof TreatySchema>['revisions'] = [];
  for (const row of rows) {
    const revision = await treatyRevision(transaction, row.id);
    revisions.push({
      id: revision.id,
      number: revision.number,
      contentHash: revision.contentHash,
      content: revision.content,
      createdAt: revision.createdAt.toISOString(),
    });
  }
  const links = await transaction
    .select()
    .from(treatyDecisions)
    .where(
      inArray(
        treatyDecisions.revisionId,
        rows.map((row) => row.id),
      ),
    );
  const decisions: z.infer<typeof TreatySchema>['decisions'] = [];
  for (const link of links) {
    const directive = await directiveRecord(transaction, link.directiveId);
    let current = false;
    try {
      const context = await directiveContext(transaction, link.directiveId, {
        id: directive.createdBy,
        admin: false,
      });
      current = context.detail.ready;
    } catch (error) {
      if (!(error instanceof DomainError)) {
        throw error;
      }
    }
    decisions.push({
      stateId: link.stateId,
      directiveId: link.directiveId,
      revisionId: link.revisionId,
      kind: link.kind,
      current,
    });
  }
  const active = revisions.find(
    (revision) => revision.id === (record.activeRevisionId ?? record.currentRevisionId),
  );
  return {
    id: record.id,
    type: record.type,
    proposerStateId: record.proposerStateId,
    status:
      record.status !== 'TERMINATED' &&
      active?.content.expiresAt !== null &&
      active?.content.expiresAt !== undefined &&
      new Date(active.content.expiresAt).getTime() <= Date.now()
        ? 'EXPIRED'
        : record.status,
    currentRevisionId: record.currentRevisionId,
    activeRevisionId: record.activeRevisionId,
    parties: await treatyPartyDtos(transaction, record.id),
    revisions,
    decisions,
  };
}
function publicStatus(
  terminated: boolean,
  expiry: string | null,
): 'TERMINATED' | 'EXPIRED' | 'ACTIVE' {
  if (terminated) {
    return 'TERMINATED';
  }
  return expiry !== null && new Date(expiry).getTime() <= Date.now() ? 'EXPIRED' : 'ACTIVE';
}
async function publicRevision(
  transaction: Transaction,
  id: string,
  locale: Locale,
): Promise<z.infer<typeof PublicTreatySchema>['revisions'][number]> {
  const revision = await treatyRevision(transaction, id);
  const { content } = revision;
  return {
    id: revision.id,
    number: revision.number,
    contentHash: revision.contentHash,
    name: content.name,
    description: content.description,
    documentHtml: await renderMarkdown(resolveText(content.document, locale).value),
    event: content.event,
    categoryMapping: content.categoryMapping,
    category: content.category,
    terms: content.terms,
    effectiveAt: content.effectiveAt,
    expiresAt: content.expiresAt,
  };
}
async function publicTreatyDto(
  transaction: Transaction,
  id: string,
  options: Readonly<{ locale: Locale; page?: number }>,
): Promise<z.infer<typeof PublicTreatySchema>> {
  const { locale, page = 1 } = options;
  const [record] = await transaction.select().from(treaties).where(eq(treaties.id, id));
  if (record === undefined || record.activeRevisionId === null) {
    throw new DomainError(HTTP.notFound, 'TREATY_NOT_FOUND', 'Опубликованный договор не найден');
  }
  const participants = await treatyPartyDtos(transaction, id);
  if (participants.some((party) => party.slug === null)) {
    throw new DomainError(HTTP.notFound, 'TREATY_NOT_FOUND', 'Опубликованный договор не найден');
  }
  const rows = await transaction
    .select({ revision: treatyRevisions })
    .from(treatyActivations)
    .innerJoin(treatyRevisions, eq(treatyRevisions.id, treatyActivations.revisionId))
    .where(eq(treatyRevisions.treatyId, id))
    .orderBy(desc(treatyRevisions.number))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  const revisions: z.infer<typeof PublicTreatySchema>['revisions'] = [];
  for (const row of rows.slice(0, HISTORY_LIMIT)) {
    revisions.push(await publicRevision(transaction, row.revision.id, locale));
  }
  const active = await treatyRevision(transaction, record.activeRevisionId);
  return {
    id,
    name: active.content.name,
    activeRevisionId: active.id,
    page,
    hasMore: rows.length > HISTORY_LIMIT,
    type: record.type,
    status: publicStatus(record.status === 'TERMINATED', active.content.expiresAt),
    parties: participants,
    revisions,
  };
}
async function stateTreaties(
  transaction: Transaction,
  stateId: string,
  page = 1,
): Promise<z.infer<typeof TreatySchema>[]> {
  const records = await transaction
    .select({ treaty: treaties })
    .from(treaties)
    .innerJoin(treatyParties, eq(treatyParties.treatyId, treaties.id))
    .where(
      and(
        eq(treatyParties.stateId, stateId),
        or(
          ne(treaties.status, 'DRAFT'),
          eq(treaties.proposerStateId, stateId),
          isNotNull(treaties.activeRevisionId),
        ),
      ),
    )
    .orderBy(desc(treaties.createdAt))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  const result: z.infer<typeof TreatySchema>[] = [];
  for (const { treaty } of records) {
    if (treaty.status !== 'DRAFT' || treaty.proposerStateId === stateId) {
      result.push(await treatyDto(transaction, treaty));
    } else if (treaty.activeRevisionId !== null) {
      const detail = await treatyDto(transaction, treaty);
      result.push({
        ...detail,
        status: 'ACTIVE',
        currentRevisionId: treaty.activeRevisionId,
        revisions: detail.revisions.filter((revision) => revision.id === treaty.activeRevisionId),
        decisions: detail.decisions.filter(
          (decision) => decision.revisionId === treaty.activeRevisionId,
        ),
      });
    }
  }
  return result;
}
export { stateTreaties, treatyDto, publicTreatyDto };
