// oxlint-disable no-await-in-loop -- Foreign-key writes on one transaction connection must remain ordered.
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  stateGovernanceRevisions,
  stateRevisionTexts,
  stateOffices,
  stateOfficeRevisionData,
  stateOfficeHolders,
  stateConstitutionRevisions,
  stateConstitutionBlocks,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { DomainError, HTTP } from '../errors';
import type { LocalizedInput } from '../localized-content/contracts';
import type { StateConfiguration } from './contracts';
import { extractTexts, hydrateTexts } from './localized-snapshot';

interface RevisionInput {
  readonly stateId: string;
  readonly number: number;
  readonly actorId: string;
  readonly previousRevisionId: string | null;
  readonly adminOverride: boolean;
  readonly reason: string | null;
  readonly configuration: StateConfiguration;
}
async function persistConstitution(
  transaction: Transaction,
  input: Readonly<{
    revisionId: string;
    stateId: string;
    configuration: StateConfiguration;
    textIds: ReadonlyMap<string, string>;
  }>,
): Promise<void> {
  const { revisionId, stateId, configuration, textIds } = input;
  if (!configuration.constitution) {
    return;
  }
  const titleTextId = textIds.get('constitution.title');
  if (titleTextId === undefined) {
    throw new Error('Constitution title not persisted');
  }
  const id = crypto.randomUUID();
  await transaction
    .insert(stateConstitutionRevisions)
    .values({ id, stateId, governanceRevisionId: revisionId, titleTextId });
  const blocks = configuration.constitution.blocks.map((block, position) => ({
    constitutionRevisionId: id,
    blockKey: block.id,
    position,
    contentTextId: textIds.get(`block.${block.id}`),
    descriptor: block.type === 'MARKDOWN' ? { ...block, content: {} } : block,
  }));
  if (blocks.length > 0) {
    await transaction.insert(stateConstitutionBlocks).values(blocks);
  }
}
async function createOfficeIdentity(
  transaction: Transaction,
  officeId: string,
  stateId: string,
): Promise<void> {
  const [foreign] = await transaction
    .select()
    .from(stateOffices)
    .where(eq(stateOffices.id, officeId));
  if (foreign) {
    throw new DomainError(
      HTTP.badRequest,
      'FOREIGN_OFFICE',
      'Должность принадлежит другому государству',
    );
  }
  await transaction.insert(stateOffices).values({ id: officeId, stateId });
}
async function persistOffices(
  transaction: Transaction,
  revisionId: string,
  input: Readonly<RevisionInput>,
): Promise<void> {
  const existing = await transaction
    .select()
    .from(stateOffices)
    .where(eq(stateOffices.stateId, input.stateId));
  const existingIds = new Set(existing.map((office) => office.id));
  const previousOffices =
    input.previousRevisionId === null
      ? []
      : await transaction
          .select({ officeId: stateOfficeRevisionData.officeId })
          .from(stateOfficeRevisionData)
          .where(eq(stateOfficeRevisionData.revisionId, input.previousRevisionId));
  const activeIds = new Set(previousOffices.map((office) => office.officeId));
  for (const [position, office] of input.configuration.governance.offices.entries()) {
    if (!existingIds.has(office.id)) {
      await createOfficeIdentity(transaction, office.id, input.stateId);
    }
    await transaction
      .insert(stateOfficeRevisionData)
      .values({ revisionId, officeId: office.id, position });
    if (!activeIds.has(office.id) && office.initialHolderIds.length > 0) {
      await transaction
        .insert(stateOfficeHolders)
        .values(office.initialHolderIds.map((userId) => ({ officeId: office.id, userId })));
    }
  }
  const removed = existing.filter(
    (office) =>
      !input.configuration.governance.offices.some((candidate) => candidate.id === office.id),
  );
  if (removed.length > 0) {
    await transaction
      .update(stateOfficeHolders)
      .set({ until: sql`transaction_timestamp()` })
      .where(
        and(
          inArray(
            stateOfficeHolders.officeId,
            removed.map((office) => office.id),
          ),
          isNull(stateOfficeHolders.until),
        ),
      );
  }
}
async function publishRevision(
  transaction: Transaction,
  input: Readonly<RevisionInput>,
): Promise<string> {
  const id = crypto.randomUUID();
  const { machine, texts } = extractTexts(input.configuration);
  await transaction.insert(stateGovernanceRevisions).values({
    id,
    stateId: input.stateId,
    number: input.number,
    actorId: input.actorId,
    previousRevisionId: input.previousRevisionId,
    adminOverride: input.adminOverride,
    reason: input.reason,
    configuration: machine,
  });
  const textIds = new Map<string, string>();
  for (const [path, values] of texts) {
    const textId = await createText(transaction, values);
    textIds.set(path, textId);
    await transaction.insert(stateRevisionTexts).values({ revisionId: id, path, textId });
  }
  await persistOffices(transaction, id, input);
  await persistConstitution(transaction, {
    revisionId: id,
    stateId: input.stateId,
    configuration: input.configuration,
    textIds,
  });
  return id;
}
async function readRevision(
  transaction: Transaction,
  id: string,
): Promise<{
  configuration: StateConfiguration;
  record: typeof stateGovernanceRevisions.$inferSelect;
}> {
  const [record] = await transaction
    .select()
    .from(stateGovernanceRevisions)
    .where(eq(stateGovernanceRevisions.id, id));
  if (!record) {
    throw new DomainError(HTTP.notFound, 'REVISION_NOT_FOUND', 'Редакция не найдена');
  }
  const refs = await transaction
    .select()
    .from(stateRevisionTexts)
    .where(eq(stateRevisionTexts.revisionId, id));
  const texts = new Map<string, LocalizedInput>();
  for (const ref of refs) {
    texts.set(ref.path, await readText(transaction, ref.textId));
  }
  return { record, configuration: hydrateTexts(record.configuration, texts) };
}
export { publishRevision, readRevision };
