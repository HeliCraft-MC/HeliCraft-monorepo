import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { companies, companyOfficeHolders } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { resolveText } from '../localized-content/contracts';
import type { CompanyRevisionContent } from './contracts';
import type { CompanyDecisionPayload } from './decision-contracts';
import { assertCompanyCharter } from './domain';
import { publishCompanyRevision } from './revisions';
import { companyHolders } from './decision-authority';

type CharterAction = Extract<
  CompanyDecisionPayload,
  { kind: 'AMEND_CHARTER' | 'UPDATE_PROFILE' | 'CREATE_OFFICE' | 'UPDATE_OFFICE' }
>;
function changedCharter(
  content: CompanyRevisionContent,
  payload: CharterAction,
): CompanyRevisionContent {
  if (payload.kind === 'AMEND_CHARTER') {
    return payload.content;
  }
  if (payload.kind === 'UPDATE_PROFILE') {
    return {
      ...content,
      name: payload.name,
      description: payload.description,
      categories: payload.categories,
      ...(payload.branding === undefined ? {} : { branding: payload.branding }),
    };
  }
  const exists = content.charter.offices.some((office) => office.id === payload.office.id);
  if (
    (payload.kind === 'CREATE_OFFICE' && exists) ||
    (payload.kind === 'UPDATE_OFFICE' && !exists)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_OFFICE_CONFLICT',
      'Должность уже существует или отсутствует',
    );
  }
  const offices =
    payload.kind === 'CREATE_OFFICE'
      ? [...content.charter.offices, payload.office]
      : content.charter.offices.map((office) =>
          office.id === payload.office.id ? payload.office : office,
        );
  return { ...content, charter: { ...content.charter, offices } };
}
function validateCharterAction(
  content: CompanyRevisionContent,
  payload: CharterAction,
): CompanyRevisionContent {
  const next = changedCharter(content, payload);
  assertCompanyCharter(next.charter);
  if (!resolveText(next.name, 'en').value.trim()) {
    throw new DomainError(HTTP.conflict, 'COMPANY_NAME_REQUIRED', 'Укажите название компании');
  }
  for (const office of next.charter.offices) {
    const previous = content.charter.offices.find((candidate) => candidate.id === office.id);
    if (
      JSON.stringify(office.initialHolderIds) !== JSON.stringify(previous?.initialHolderIds ?? [])
    ) {
      throw new DomainError(
        HTTP.conflict,
        'COMPANY_APPOINTMENT_REQUIRED',
        'Изменение устава не назначает должностных лиц. Используйте отдельное решение о назначении',
      );
    }
  }
  return next;
}
async function assertCharterRoster(
  transaction: Transaction,
  companyId: string,
  next: CompanyRevisionContent,
): Promise<void> {
  const holders = await companyHolders(transaction, companyId);
  if (
    next.charter.offices.some((office) => {
      const count = holders.filter((holder) => holder.officeId === office.id).length;
      return count > office.maxHolders || (office.required && count === 0);
    })
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_ROSTER_CONFLICT',
      'Действующий состав должен помещаться в должности, а обязательные должности должны быть заняты',
    );
  }
}
async function applyCharterAction(
  transaction: Transaction,
  input: Readonly<{
    companyId: string;
    actorId: string;
    decisionId: string;
    content: CompanyRevisionContent;
    payload: CharterAction;
  }>,
): Promise<void> {
  const next = validateCharterAction(input.content, input.payload);
  await assertCharterRoster(transaction, input.companyId, next);
  const removed = input.content.charter.offices
    .filter((office) => !next.charter.offices.some((candidate) => candidate.id === office.id))
    .map((office) => office.id);
  if (removed.length > 0) {
    await transaction
      .update(companyOfficeHolders)
      .set({ until: sql`clock_timestamp()` })
      .where(
        and(inArray(companyOfficeHolders.officeId, removed), isNull(companyOfficeHolders.until)),
      );
  }
  const id = await publishCompanyRevision(transaction, {
    companyId: input.companyId,
    actorId: input.actorId,
    content: next,
    decisionId: input.decisionId,
  });
  await transaction
    .update(companies)
    .set({ currentRevisionId: id })
    .where(eq(companies.id, input.companyId));
}
export { validateCharterAction, assertCharterRoster, applyCharterAction, type CharterAction };
