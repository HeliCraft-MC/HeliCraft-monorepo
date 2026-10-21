import { and, eq, isNull, sql } from 'drizzle-orm';
import { companyOfficeHolders } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { CompanyRevisionContent } from './contracts';
import { companyHolders } from './decision-authority';
import { ensureSubject } from './store';

type OfficeAction = Extract<
  CompanyDecisionPayload,
  { kind: 'APPOINT_OFFICE_HOLDER' | 'REMOVE_OFFICE_HOLDER' }
>;
async function assertOfficeAction(
  transaction: Transaction,
  input: Readonly<{ companyId: string; content: CompanyRevisionContent; payload: OfficeAction }>,
): Promise<void> {
  const { payload, content, companyId } = input;
  const office = content.charter.offices.find((candidate) => candidate.id === payload.officeId);
  if (!office) {
    throw new DomainError(
      HTTP.conflict,
      'UNKNOWN_COMPANY_OFFICE',
      'Должность отсутствует в уставе',
    );
  }
  const serving = await companyHolders(transaction, companyId);
  const holders = serving.filter((holder) => holder.officeId === office.id);
  if (payload.kind === 'REMOVE_OFFICE_HOLDER') {
    if (
      !holders.some((holder) => holder.userId === payload.userId) ||
      (office.required && holders.length <= 1)
    ) {
      throw new DomainError(
        HTTP.conflict,
        'COMPANY_REMOVAL_BLOCKED',
        'Назначение не действует или обязательная должность останется пустой',
      );
    }
    return;
  }
  await ensureSubject(transaction, { type: 'PLAYER', id: payload.userId });
  const replacement = payload.replacedUserId === null ? 0 : 1;
  if (
    holders.some((holder) => holder.userId === payload.userId) ||
    (payload.replacedUserId !== null &&
      !holders.some((holder) => holder.userId === payload.replacedUserId)) ||
    holders.length - replacement >= office.maxHolders
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_APPOINTMENT_BLOCKED',
      'Проверьте действующий состав, заменяемого участника и число мест',
    );
  }
}
async function applyOfficeAction(
  transaction: Transaction,
  input: Readonly<{
    companyId: string;
    revisionId: string;
    content: CompanyRevisionContent;
    payload: OfficeAction;
  }>,
): Promise<void> {
  await assertOfficeAction(transaction, input);
  const { payload } = input;
  const ended = payload.kind === 'REMOVE_OFFICE_HOLDER' ? payload.userId : payload.replacedUserId;
  if (ended !== null) {
    await transaction
      .update(companyOfficeHolders)
      .set({ until: sql`clock_timestamp()` })
      .where(
        and(
          eq(companyOfficeHolders.officeId, payload.officeId),
          eq(companyOfficeHolders.userId, ended),
          isNull(companyOfficeHolders.until),
        ),
      );
  }
  if (payload.kind === 'APPOINT_OFFICE_HOLDER') {
    // Expired terms stay historical; a new appointment always receives a fresh interval identity.
    await transaction
      .update(companyOfficeHolders)
      .set({ until: sql`clock_timestamp()` })
      .where(
        and(
          eq(companyOfficeHolders.officeId, payload.officeId),
          eq(companyOfficeHolders.userId, payload.userId),
          isNull(companyOfficeHolders.until),
        ),
      );
    await transaction.insert(companyOfficeHolders).values({
      officeId: payload.officeId,
      userId: payload.userId,
      revisionId: input.revisionId,
      since: sql`clock_timestamp()`,
    });
  }
}
export { assertOfficeAction, applyOfficeAction, type OfficeAction };
