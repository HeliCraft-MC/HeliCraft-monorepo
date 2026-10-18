import { desc, eq } from 'drizzle-orm';
import { taxOffices, taxLaws, taxLawRevisions, economicDirectiveDocuments } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import type { DirectiveRecord } from '../monetary/store';
import type { TaxDirective } from './contracts';
import { taxBeneficiary } from './beneficiary';

async function latestLawRevision(
  transaction: Transaction,
  lawId: string,
): Promise<typeof taxLawRevisions.$inferSelect | null> {
  const [revision] = await transaction
    .select()
    .from(taxLawRevisions)
    .where(eq(taxLawRevisions.lawId, lawId))
    .orderBy(desc(taxLawRevisions.number))
    .limit(1);
  return revision ?? null;
}
async function assertTaxDirective(
  transaction: Transaction,
  stateId: string,
  payload: TaxDirective,
): Promise<void> {
  const [office] = await transaction
    .select()
    .from(taxOffices)
    .where(eq(taxOffices.stateId, stateId))
    .for('update');
  if (payload.kind === 'ESTABLISH_TAX_OFFICE') {
    if (office && office.status !== 'REJECTED') {
      monetaryError('TAX_OFFICE_EXISTS', 'Налоговая служба уже учреждена или ожидает одобрения');
    }
    return;
  }
  if (office?.status !== 'ACTIVE') {
    monetaryError('TAX_OFFICE_INACTIVE', 'Требуется действующая налоговая служба');
  }
  if (!('lawId' in payload)) {
    return;
  }
  if ('rule' in payload) {
    await taxBeneficiary(transaction, stateId, payload.rule);
  }
  const [law] = await transaction.select().from(taxLaws).where(eq(taxLaws.id, payload.lawId));
  if (payload.kind === 'ENACT_TAX_LAW') {
    if (law) {
      monetaryError('TAX_LAW_EXISTS', 'Закон с таким идентификатором уже существует');
    }
    return;
  }
  const previous = await latestLawRevision(transaction, payload.lawId);
  if (
    law?.stateId !== stateId ||
    !previous ||
    previous.id !== payload.baseRevisionId ||
    previous.status === 'REPEALED'
  ) {
    monetaryError('TAX_LAW_STALE', 'Закон изменился или отменён. Подготовьте новое решение');
  }
  if (new Date(payload.effectiveAt) < previous.effectiveAt) {
    monetaryError('TAX_EFFECTIVE_DATE', 'Новая редакция не может предшествовать предыдущей');
  }
}
async function updateTaxOffice(
  transaction: Transaction,
  record: DirectiveRecord,
  payload: Extract<TaxDirective, { kind: 'ESTABLISH_TAX_OFFICE' | 'CHANGE_TAX_CHARTER' }>,
): Promise<void> {
  const [office] = await transaction
    .select()
    .from(taxOffices)
    .where(eq(taxOffices.stateId, record.stateId));
  // oxlint-disable-next-line unicorn/prefer-ternary -- The institution uses separate explicit insert and update operations.
  if (office === undefined) {
    await transaction.insert(taxOffices).values({
      stateId: record.stateId,
      establishmentDirectiveId: record.id,
      charterDirectiveId: record.id,
    });
  } else {
    await transaction
      .update(taxOffices)
      .set(
        payload.kind === 'ESTABLISH_TAX_OFFICE'
          ? {
              establishmentDirectiveId: record.id,
              charterDirectiveId: record.id,
              status: 'PENDING',
            }
          : { charterDirectiveId: record.id },
      )
      .where(eq(taxOffices.id, office.id));
  }
}
function requiredText(id: string | null | undefined): string {
  if (id === null || id === undefined) {
    throw new Error('Law text references missing');
  }
  return id;
}
async function executeTaxDirective(
  transaction: Transaction,
  record: DirectiveRecord,
  payload: TaxDirective,
): Promise<void> {
  await assertTaxDirective(transaction, record.stateId, payload);
  if (payload.kind === 'ESTABLISH_TAX_OFFICE' || payload.kind === 'CHANGE_TAX_CHARTER') {
    await updateTaxOffice(transaction, record, payload);
    return;
  }
  const previous = await latestLawRevision(transaction, payload.lawId);
  if (payload.kind === 'ENACT_TAX_LAW') {
    await transaction.insert(taxLaws).values({ id: payload.lawId, stateId: record.stateId });
  }
  const rule = 'rule' in payload ? payload.rule : previous?.rule;
  if (!rule) {
    throw new Error('Tax rule missing');
  }
  const nameTextId = requiredText(record.nameTextId ?? previous?.nameTextId);
  const descriptionTextId = requiredText(record.descriptionTextId ?? previous?.descriptionTextId);
  const [document] = await transaction
    .select()
    .from(economicDirectiveDocuments)
    .where(eq(economicDirectiveDocuments.directiveId, record.id));
  const documentTextId = requiredText(document?.textId ?? previous?.documentTextId);
  await transaction.insert(taxLawRevisions).values({
    nameTextId,
    descriptionTextId,
    documentTextId,
    lawId: payload.lawId,
    directiveId: record.id,
    number: (previous?.number ?? 0) + 1,
    status: payload.kind === 'REPEAL_TAX_LAW' ? 'REPEALED' : 'ACTIVE',
    rule,
    effectiveAt: new Date(Math.max(Date.now(), new Date(payload.effectiveAt).getTime())),
  });
}
export { latestLawRevision, assertTaxDirective, executeTaxDirective };
