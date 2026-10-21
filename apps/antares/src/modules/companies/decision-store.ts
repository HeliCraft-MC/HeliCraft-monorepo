import { eq } from 'drizzle-orm';
import { companyDecisions, companyDecisionTexts } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { createText, readText } from '../localized-content/service';
import { monetaryHash } from '../monetary/domain';
import type { CompanyDecisionPayload } from './decision-contracts';
import { extractDecisionTexts, mapDecisionTexts } from './decision-texts';
import type { LocalizedInput } from '../localized-content/contracts';

type CompanyDecisionRecord = typeof companyDecisions.$inferSelect;
async function decisionRecord(
  transaction: Transaction,
  id: string,
): Promise<CompanyDecisionRecord> {
  const [record] = await transaction
    .select()
    .from(companyDecisions)
    .where(eq(companyDecisions.id, id))
    .for('update');
  if (!record) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_DECISION_NOT_FOUND',
      'Корпоративное решение не найдено',
    );
  }
  return record;
}
async function storeDecisionPayload(
  transaction: Transaction,
  id: string,
  payload: CompanyDecisionPayload,
): Promise<void> {
  const { texts } = extractDecisionTexts(payload);
  for (const [path, values] of texts) {
    // oxlint-disable-next-line no-await-in-loop -- Immutable localized proof is created on the decision's transaction connection.
    const textId = await createText(transaction, values);
    // oxlint-disable-next-line no-await-in-loop -- References pin each exact corporate payload field.
    await transaction.insert(companyDecisionTexts).values({ decisionId: id, path, textId });
  }
}
async function readDecisionPayload(
  transaction: Transaction,
  record: CompanyDecisionRecord,
): Promise<CompanyDecisionPayload> {
  const references = await transaction
    .select()
    .from(companyDecisionTexts)
    .where(eq(companyDecisionTexts.decisionId, record.id));
  const texts = new Map<string, LocalizedInput>();
  for (const reference of references) {
    // oxlint-disable-next-line no-await-in-loop -- Read immutable translations sequentially on the locked evidence connection.
    texts.set(reference.path, await readText(transaction, reference.textId));
  }
  const payload = mapDecisionTexts(record.payload, (path) => texts.get(path) ?? {});
  if (monetaryHash(payload) !== record.payloadHash) {
    throw new Error('Corporate decision payload integrity failure');
  }
  return payload;
}
export { decisionRecord, storeDecisionPayload, readDecisionPayload, type CompanyDecisionRecord };
