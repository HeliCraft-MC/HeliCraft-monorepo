import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import {
  companies,
  companyRevisions,
  companyShareBalances,
  companyOfficeHolders,
  companyOffices,
  users,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { eligibleUsers, assertElectorateAvailable } from './eligibility';
import type { VotingInput } from './contracts';

type Electorate = VotingInput['electorate'];
type CorporateElectorate = Extract<Electorate, { companyId: string }>;
interface FrozenVoter {
  readonly voterId: string;
  readonly userId: string | null;
  readonly subjectId: string | null;
  readonly weight: string;
}
async function assertCorporateElectorate(
  transaction: Transaction,
  electorate: CorporateElectorate,
): Promise<void> {
  const [company] = await transaction
    .select()
    .from(companies)
    .where(eq(companies.id, electorate.companyId));
  if (company?.status !== 'ACTIVE' || company.currentRevisionId === null) {
    throw new DomainError(HTTP.conflict, 'COMPANY_INACTIVE', 'Компания не активна');
  }
  if (electorate.type === 'COMPANY_OFFICE_HOLDERS') {
    const [revision] = await transaction
      .select()
      .from(companyRevisions)
      .where(eq(companyRevisions.id, company.currentRevisionId));
    if (
      !revision ||
      electorate.officeIds.some(
        (id) => !revision.content.charter.offices.some((office) => office.id === id),
      )
    ) {
      throw new DomainError(
        HTTP.badRequest,
        'UNKNOWN_COMPANY_OFFICE',
        'Должность отсутствует в действующем уставе компании',
      );
    }
  }
}
async function assertVotingElectorate(
  transaction: Transaction,
  electorate: Electorate,
): Promise<void> {
  await ('companyId' in electorate
    ? assertCorporateElectorate(transaction, electorate)
    : assertElectorateAvailable(transaction, electorate));
}
async function corporateVoters(
  transaction: Transaction,
  electorate: CorporateElectorate,
): Promise<FrozenVoter[]> {
  await assertCorporateElectorate(transaction, electorate);
  if (electorate.type === 'COMPANY_SHAREHOLDERS') {
    const positions = await transaction
      .select()
      .from(companyShareBalances)
      .where(
        and(
          eq(companyShareBalances.companyId, electorate.companyId),
          gt(companyShareBalances.shares, '0'),
        ),
      )
      .orderBy(asc(companyShareBalances.subjectId));
    return positions.map((position) => ({
      voterId: position.subjectId,
      userId: null,
      subjectId: position.subjectId,
      weight: position.shares,
    }));
  }
  const rows = await transaction
    .select({ userId: companyOfficeHolders.userId })
    .from(companyOfficeHolders)
    .innerJoin(companyOffices, eq(companyOffices.id, companyOfficeHolders.officeId))
    .innerJoin(users, eq(users.id, companyOfficeHolders.userId))
    .where(
      and(
        eq(companyOffices.companyId, electorate.companyId),
        inArray(companyOffices.id, electorate.officeIds),
        eq(users.status, 'ACTIVE'),
        sql`company_holder_term_current(${companyOfficeHolders.id})`,
      ),
    );
  return (
    [...new Set(rows.map((row) => row.userId))]
      // oxlint-disable-next-line unicorn/no-array-sort -- ES2022 sorting only this fresh identity array keeps the shared compiler target unchanged.
      .sort()
      .map((userId) => ({ voterId: userId, userId, subjectId: null, weight: '1' }))
  );
}
async function frozenVoters(
  transaction: Transaction,
  electorate: Electorate,
): Promise<FrozenVoter[]> {
  if ('companyId' in electorate) {
    return await corporateVoters(transaction, electorate);
  }
  const identities = await eligibleUsers(transaction, electorate);
  return identities.map((userId) => ({
    voterId: userId,
    userId,
    subjectId: null,
    weight: '1',
  }));
}
export { assertVotingElectorate, frozenVoters, type FrozenVoter };
