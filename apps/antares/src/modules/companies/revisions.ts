import { desc, eq, sql } from 'drizzle-orm';
import { companyRevisions, companyRevisionTexts, companyOffices } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { monetaryHash } from '../monetary/domain';
import { DomainError, HTTP } from '../errors';
import type { CompanyRevisionContent } from './contracts';
import { extractCompanyTexts, hydrateCompanyTexts } from './localized-snapshot';
import { assertCompanyBrandingMedia } from './media-integrity';
import { assertCompanyCharter } from './domain';

async function readCompanyRevision(
  transaction: Transaction,
  id: string,
): Promise<{ record: typeof companyRevisions.$inferSelect; content: CompanyRevisionContent }> {
  const [record] = await transaction
    .select()
    .from(companyRevisions)
    .where(eq(companyRevisions.id, id));
  if (!record) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_REVISION_NOT_FOUND',
      'Редакция устава не найдена',
    );
  }
  const references = await transaction
    .select()
    .from(companyRevisionTexts)
    .where(eq(companyRevisionTexts.revisionId, id));
  const texts = await Promise.all(
    references.map(
      async (reference) => [reference.path, await readText(transaction, reference.textId)] as const,
    ),
  );
  const content = hydrateCompanyTexts(record.content, new Map(texts));
  if (monetaryHash(content) !== record.contentHash) {
    throw new Error('Company revision text integrity failure');
  }
  return { record, content };
}
async function createOfficeIdentities(
  transaction: Transaction,
  companyId: string,
  content: CompanyRevisionContent,
): Promise<void> {
  for (const office of content.charter.offices) {
    // oxlint-disable-next-line no-await-in-loop -- Stable office identities are checked and reserved on one transaction connection.
    await transaction
      .insert(companyOffices)
      .values({ id: office.id, companyId })
      .onConflictDoNothing();
    // oxlint-disable-next-line no-await-in-loop -- A UUID from another company can never be adopted by a new charter.
    const [record] = await transaction
      .select()
      .from(companyOffices)
      .where(eq(companyOffices.id, office.id));
    if (record?.companyId !== companyId) {
      throw new DomainError(
        HTTP.conflict,
        'FOREIGN_COMPANY_OFFICE',
        'Должность принадлежит другой компании',
      );
    }
  }
}
async function publishCompanyRevision(
  transaction: Transaction,
  input: Readonly<{
    companyId: string;
    actorId: string;
    content: CompanyRevisionContent;
    decisionId?: string;
  }>,
): Promise<string> {
  assertCompanyCharter(input.content.charter);
  await assertCompanyBrandingMedia(transaction, input.companyId, input.content.branding);
  const [previous] = await transaction
    .select()
    .from(companyRevisions)
    .where(eq(companyRevisions.companyId, input.companyId))
    .orderBy(desc(companyRevisions.number))
    .limit(1);
  const id = crypto.randomUUID();
  const { machine, texts } = extractCompanyTexts(input.content);
  await transaction.insert(companyRevisions).values({
    id,
    companyId: input.companyId,
    number: (previous?.number ?? 0) + 1,
    previousRevisionId: previous?.id ?? null,
    decisionId: input.decisionId ?? null,
    actorId: input.actorId,
    content: machine,
    contentHash: monetaryHash(input.content),
    createdAt: sql`clock_timestamp()`,
  });
  for (const [path, values] of texts) {
    // oxlint-disable-next-line no-await-in-loop -- Normalized immutable text references are created within their revision's transaction.
    const textId = await createText(transaction, values);
    // oxlint-disable-next-line no-await-in-loop -- Every localized field uses the single traversal and its exact revision path.
    await transaction.insert(companyRevisionTexts).values({ revisionId: id, path, textId });
  }
  await createOfficeIdentities(transaction, input.companyId, input.content);
  return id;
}
export { readCompanyRevision, publishCompanyRevision, createOfficeIdentities };
