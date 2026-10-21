import { eq, sql } from 'drizzle-orm';
import { companyOfficeHolders, companyRegistrationApplications } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { companyRecord, changeCompanyStatus } from './store';
import { readCompanyRevision } from './revisions';
import { initialOwnership } from './ownership';

// oxlint-disable-next-line max-lines-per-function -- Approval, immutable ownership and the initial consented office roster must commit as one registration.
async function activateCompany(
  transaction: Transaction,
  input: Readonly<{ applicationId: string; actorId: string; directiveId: string | null }>,
): Promise<void> {
  const [application] = await transaction
    .select()
    .from(companyRegistrationApplications)
    .where(eq(companyRegistrationApplications.id, input.applicationId))
    .for('update');
  if (!application) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_APPLICATION_NOT_FOUND',
      'Регистрационная заявка не найдена',
    );
  }
  const company = await companyRecord(transaction, application.companyId);
  if (
    application.status !== 'PENDING' ||
    company.status !== 'PENDING_REGISTRATION' ||
    company.currentApplicationId !== application.id ||
    company.foundedAt !== null
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_REGISTRATION_STALE',
      'Регистрационная заявка уже рассмотрена или заменена',
    );
  }
  const revision = await readCompanyRevision(transaction, application.revisionId);
  await transaction
    .update(companyRegistrationApplications)
    .set({
      status: 'APPROVED',
      reviewDirectiveId: input.directiveId,
      reviewedAt: sql`clock_timestamp()`,
    })
    .where(eq(companyRegistrationApplications.id, application.id));
  await changeCompanyStatus(transaction, {
    company,
    actorId: input.actorId,
    status: 'ACTIVE',
    reason: 'Company registration approved',
    applicationId: application.id,
    revisionId: application.revisionId,
    founded: true,
  });
  await initialOwnership(transaction, application, input.actorId);
  const holders = revision.content.charter.offices.flatMap((office) =>
    office.initialHolderIds.map((userId) => ({
      officeId: office.id,
      userId,
      revisionId: application.revisionId,
      since: sql`clock_timestamp()`,
    })),
  );
  if (holders.length > 0) {
    await transaction.insert(companyOfficeHolders).values(holders);
  }
}
export { activateCompany };
