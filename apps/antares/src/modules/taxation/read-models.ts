// oxlint-disable import/max-dependencies -- The protected tax read combines institution, law, decision and assessment readers with actual ledger receipts.
// oxlint-disable no-await-in-loop -- Bounded immutable revisions hydrate through one transaction connection.
import { stateAssessments } from './assessments';
import { and, desc, eq, inArray, lte, or, sql } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import {
  taxOffices,
  taxOfficeReviews,
  taxLaws,
  taxLawRevisions,
  taxAssessments,
  economicJournals,
  ledgerTransactions,
  currencies,
  monetaryDirectives,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readText } from '../localized-content/service';
import { directiveRecord, hydratePayload } from '../monetary/store';
import { stateAccounts, currencyDto, HISTORY_LIMIT } from '../monetary/read-models';
import { directiveContext } from '../monetary/directive-context';
import type { MonetaryActor } from '../monetary/contracts';
import type { LawRevisionSchema, TaxOfficeSchema, StateTaxationSchema } from './read-contracts';

async function taxOfficeDto(
  transaction: Transaction,
  record: typeof taxOffices.$inferSelect,
): Promise<z.infer<typeof TaxOfficeSchema>> {
  const payload = await hydratePayload(
    transaction,
    await directiveRecord(transaction, record.charterDirectiveId),
  );
  if (!('name' in payload)) {
    throw new Error('Missing tax charter');
  }
  const reviews = await transaction
    .select()
    .from(taxOfficeReviews)
    .where(eq(taxOfficeReviews.officeId, record.id))
    .orderBy(desc(taxOfficeReviews.createdAt));
  return {
    ...record,
    name: payload.name,
    description: payload.description,
    createdAt: record.createdAt.toISOString(),
    reviews: reviews.map((review) => ({
      id: review.id,
      actorId: review.actorId,
      status: review.status,
      reason: review.reason,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}
async function lawRevisionDto(
  transaction: Transaction,
  revision: typeof taxLawRevisions.$inferSelect,
  stateId: string,
): Promise<z.infer<typeof LawRevisionSchema>> {
  return {
    id: revision.id,
    lawId: revision.lawId,
    stateId,
    directiveId: revision.directiveId,
    number: revision.number,
    status: revision.status,
    rule: revision.rule,
    name: await readText(transaction, revision.nameTextId),
    description: await readText(transaction, revision.descriptionTextId),
    document: await readText(transaction, revision.documentTextId),
    effectiveAt: revision.effectiveAt.toISOString(),
    createdAt: revision.createdAt.toISOString(),
  };
}
async function stateLawRevisions(
  transaction: Transaction,
  stateId: string,
  options: Readonly<{ page?: number; publicOnly?: boolean; lawId?: string }> = {},
): Promise<z.infer<typeof LawRevisionSchema>[]> {
  const rows = await transaction
    .select({ revision: taxLawRevisions })
    .from(taxLawRevisions)
    .innerJoin(taxLaws, eq(taxLaws.id, taxLawRevisions.lawId))
    .where(
      and(
        eq(taxLaws.stateId, stateId),
        options.lawId === undefined ? undefined : eq(taxLaws.id, options.lawId),
        options.publicOnly === true ? lte(taxLawRevisions.effectiveAt, new Date()) : undefined,
      ),
    )
    .orderBy(desc(taxLawRevisions.createdAt), desc(taxLawRevisions.number))
    .limit(HISTORY_LIMIT + 1)
    .offset(((options.page ?? 1) - 1) * HISTORY_LIMIT);
  const result: z.infer<typeof LawRevisionSchema>[] = [];
  for (const { revision } of rows) {
    result.push(await lawRevisionDto(transaction, revision, stateId));
  }
  return result;
}
async function currentStateLaws(
  transaction: Transaction,
  stateId: string,
): Promise<z.infer<typeof LawRevisionSchema>[]> {
  const rows = await transaction
    .selectDistinctOn([taxLawRevisions.lawId], { revision: taxLawRevisions })
    .from(taxLawRevisions)
    .innerJoin(taxLaws, eq(taxLaws.id, taxLawRevisions.lawId))
    .where(and(eq(taxLaws.stateId, stateId), lte(taxLawRevisions.effectiveAt, new Date())))
    .orderBy(taxLawRevisions.lawId, desc(taxLawRevisions.number));
  const result: z.infer<typeof LawRevisionSchema>[] = [];
  for (const row of rows) {
    if (row.revision.status === 'ACTIVE') {
      result.push(await lawRevisionDto(transaction, row.revision, stateId));
    }
  }
  return result;
}
// oxlint-disable-next-line max-lines-per-function, max-params -- One bounded protected workspace combines laws, decision evidence and actual treasury receipts.
async function stateTaxationDto(
  transaction: Transaction,
  stateId: string,
  actor: MonetaryActor,
  page: number,
): Promise<z.infer<typeof StateTaxationSchema>> {
  const [office] = await transaction
    .select()
    .from(taxOffices)
    .where(eq(taxOffices.stateId, stateId));
  const laws = await stateLawRevisions(transaction, stateId, { page });
  const decisions = await transaction
    .select({ id: monetaryDirectives.id })
    .from(monetaryDirectives)
    .where(
      and(
        eq(monetaryDirectives.stateId, stateId),
        sql`${monetaryDirectives.payload}->>'kind' in ('ESTABLISH_TAX_OFFICE','CHANGE_TAX_CHARTER','ENACT_TAX_LAW','AMEND_TAX_LAW','REPEAL_TAX_LAW')`,
      ),
    )
    .orderBy(desc(monetaryDirectives.createdAt))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  const directives: z.infer<typeof StateTaxationSchema>['directives'] = [];
  for (const decision of decisions.slice(0, HISTORY_LIMIT)) {
    const context = await directiveContext(transaction, decision.id, actor);
    directives.push(context.detail);
  }
  const receipts = await transaction
    .select({ journal: ledgerTransactions, link: economicJournals, charge: taxAssessments.charge })
    .from(economicJournals)
    .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, economicJournals.journalId))
    .innerJoin(taxAssessments, eq(taxAssessments.id, economicJournals.assessmentId))
    .where(eq(economicJournals.creditorStateId, stateId))
    .orderBy(desc(ledgerTransactions.createdAt))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  const totals = await transaction
    .select({
      currencyId: ledgerTransactions.currencyId,
      amountMinor: sql<string>`sum(${ledgerTransactions.amountMinor})::text`,
    })
    .from(economicJournals)
    .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, economicJournals.journalId))
    .where(eq(economicJournals.creditorStateId, stateId))
    .groupBy(ledgerTransactions.currencyId);
  const assessments = await stateAssessments(transaction, stateId, page);
  const accounts = await stateAccounts(transaction, stateId, null);
  const currencyRecords = await transaction
    .select()
    .from(currencies)
    .where(
      or(
        inArray(
          currencies.id,
          assessments.map((assessment) => assessment.currencyId),
        ),
        sql`${currencies.id} in (select currency_id from financial_accounts where kind = 'TREASURY' and owner_id = ${stateId})`,
      ),
    );
  const money: z.infer<typeof StateTaxationSchema>['currencies'] = [];
  for (const currency of currencyRecords) {
    money.push(await currencyDto(transaction, currency));
  }
  return {
    office: office ? await taxOfficeDto(transaction, office) : null,
    laws: laws.slice(0, HISTORY_LIMIT),
    directives,
    accounts,
    assessments: assessments.slice(0, HISTORY_LIMIT),
    currencies: money,
    totals,
    receipts: receipts.slice(0, HISTORY_LIMIT).flatMap(({ journal, link, charge }) =>
      link.assessmentId === null
        ? []
        : [
            {
              laws: charge.claims.map((claim) => ({
                lawId: claim.lawId,
                revisionId: claim.revisionId,
                number: claim.revision,
                name: claim.name,
              })),
              treatyId: charge.treatyId,
              treatyRevisionId: charge.treatyRevisionId,
              treatyName: charge.treatyName,
              assessmentId: link.assessmentId,
              operationId: link.operationId,
              journalId: journal.id,
              currencyId: journal.currencyId,
              amountMinor: journal.amountMinor,
              createdAt: journal.createdAt.toISOString(),
            },
          ],
    ),
    page,
    hasMore:
      assessments.length > HISTORY_LIMIT ||
      laws.length > HISTORY_LIMIT ||
      decisions.length > HISTORY_LIMIT ||
      receipts.length > HISTORY_LIMIT,
  };
}
export { taxOfficeDto, lawRevisionDto, stateLawRevisions, stateTaxationDto, currentStateLaws };
