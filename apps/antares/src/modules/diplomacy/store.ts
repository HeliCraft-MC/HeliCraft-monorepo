import { eq } from 'drizzle-orm';
import { treaties, treatyParties, treatyRevisions } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { monetaryHash, monetaryError } from '../monetary/domain';
import type { TreatyContent } from './contracts';

const BILATERAL_PARTIES = 2;
async function treatyRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof treaties.$inferSelect> {
  const [record] = await transaction
    .select()
    .from(treaties)
    .where(eq(treaties.id, id))
    .for('update');
  if (!record) {
    monetaryError('TREATY_NOT_FOUND', 'Договор не найден');
  }
  return record;
}
async function treatyRevision(
  transaction: Transaction,
  id: string,
): Promise<typeof treatyRevisions.$inferSelect & { content: TreatyContent }> {
  const [record] = await transaction
    .select()
    .from(treatyRevisions)
    .where(eq(treatyRevisions.id, id));
  if (!record) {
    monetaryError('TREATY_REVISION_NOT_FOUND', 'Редакция договора не найдена');
  }
  const content = {
    ...record.content,
    name: await readText(transaction, record.nameTextId),
    description: await readText(transaction, record.descriptionTextId),
    document: await readText(transaction, record.documentTextId),
  };
  if (monetaryHash(content) !== record.contentHash) {
    monetaryError('TREATY_INTEGRITY', 'Содержимое договора не совпадает с утверждённой редакцией');
  }
  return { ...record, content };
}
async function parties(transaction: Transaction, treatyId: string): Promise<[string, string]> {
  const rows = await transaction
    .select()
    .from(treatyParties)
    .where(eq(treatyParties.treatyId, treatyId))
    .orderBy(treatyParties.position);
  if (rows.length !== BILATERAL_PARTIES || !rows[0] || !rows[1]) {
    throw new Error('Treaty must have exactly two parties');
  }
  return [rows[0].stateId, rows[1].stateId];
}
async function insertTreatyRevision(
  transaction: Transaction,
  input: Readonly<{
    id: string;
    treatyId: string;
    number: number;
    actorId: string;
    content: TreatyContent;
  }>,
): Promise<void> {
  const { content } = input;
  await transaction.insert(treatyRevisions).values({
    id: input.id,
    treatyId: input.treatyId,
    number: input.number,
    createdBy: input.actorId,
    content: { ...content, name: {}, description: {}, document: {} },
    contentHash: monetaryHash(content),
    nameTextId: await createText(transaction, content.name),
    descriptionTextId: await createText(transaction, content.description),
    documentTextId: await createText(transaction, content.document),
  });
}
export { treatyRecord, treatyRevision, parties, insertTreatyRevision };
