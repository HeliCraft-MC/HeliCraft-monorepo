import { and, eq, gt, sql } from 'drizzle-orm';
import {
  companyOfficeHolders,
  companyOffices,
  companyShareBalances,
  users,
  legalSubjects,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { CompanyCharter, CompanyProcedure } from './contracts';
import type { CompanyDecisionPayload } from './decision-contracts';
import { companyProcedure, companyRequirements, corporateError } from './domain';
import { monetaryHash } from '../monetary/domain';

type CurrentCompanyHolder = typeof companyOfficeHolders.$inferSelect;
async function companyHolders(
  transaction: Transaction,
  companyId: string,
  beforeDecisionId?: string,
): Promise<CurrentCompanyHolder[]> {
  return await transaction
    .select({
      id: companyOfficeHolders.id,
      officeId: companyOfficeHolders.officeId,
      userId: companyOfficeHolders.userId,
      revisionId: companyOfficeHolders.revisionId,
      since: companyOfficeHolders.since,
      until: companyOfficeHolders.until,
    })
    .from(companyOfficeHolders)
    .innerJoin(companyOffices, eq(companyOffices.id, companyOfficeHolders.officeId))
    .innerJoin(users, eq(users.id, companyOfficeHolders.userId))
    .where(
      and(
        eq(companyOffices.companyId, companyId),
        eq(users.status, 'ACTIVE'),
        sql`company_holder_term_current(${companyOfficeHolders.id})`,
        beforeDecisionId === undefined
          ? undefined
          : sql`${companyOfficeHolders.since} <= (select created_at from company_decisions where id = ${beforeDecisionId})`,
      ),
    );
}
function decisionProcedures(
  charter: CompanyCharter,
  payload: CompanyDecisionPayload,
): CompanyProcedure[] {
  const procedures = [
    companyProcedure(
      charter,
      payload.kind,
      payload.kind === 'TRANSFER_FUNDS'
        ? {
            currencyId: payload.currencyId,
            amountMinor: payload.approvedDebitMinor ?? payload.amountMinor,
          }
        : undefined,
    ),
  ];
  if (payload.kind === 'APPOINT_OFFICE_HOLDER' || payload.kind === 'REMOVE_OFFICE_HOLDER') {
    const office = charter.offices.find((candidate) => candidate.id === payload.officeId);
    if (!office) {
      corporateError('UNKNOWN_COMPANY_OFFICE', 'Должность отсутствует в действующем уставе');
    }
    procedures.push(payload.kind === 'REMOVE_OFFICE_HOLDER' ? office.removal : office.appointment);
    if (payload.kind === 'APPOINT_OFFICE_HOLDER' && payload.replacedUserId !== null) {
      procedures.push(office.removal);
    }
  }
  return procedures;
}
function decisionRequirements(
  companyId: string,
  charter: CompanyCharter,
  procedures: readonly CompanyProcedure[],
): ReturnType<typeof companyRequirements> {
  const compiled = procedures.map((procedure) =>
    companyRequirements(companyId, charter, procedure),
  );
  const votes = compiled.flatMap((requirement) => requirement.votes);
  return {
    approvalGroups: compiled.flatMap((requirement) => requirement.approvalGroups),
    votes: votes.filter(
      (vote, index) =>
        votes.findIndex((other) => monetaryHash(other) === monetaryHash(vote)) === index,
    ),
    manual: compiled.some((requirement) => requirement.manual),
  };
}
async function isPersonalShareholder(
  transaction: Transaction,
  companyId: string,
  actorId: string,
): Promise<boolean> {
  const [position] = await transaction
    .select({ companyId: companyShareBalances.companyId })
    .from(companyShareBalances)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareBalances.subjectId))
    .where(
      and(
        eq(companyShareBalances.companyId, companyId),
        eq(companyShareBalances.subjectId, actorId),
        gt(companyShareBalances.shares, '0'),
        eq(legalSubjects.kind, 'PLAYER'),
        eq(legalSubjects.playerId, actorId),
      ),
    );
  return position !== undefined;
}
function procedureActor(
  procedure: CompanyProcedure,
  input: Readonly<{
    actorId: string;
    shareholder: boolean;
    holders: readonly CurrentCompanyHolder[];
  }>,
): boolean {
  const officeHolder = input.holders.some(
    (holder) => holder.userId === input.actorId && procedure.officeIds.includes(holder.officeId),
  );
  if (procedure.mechanism === 'MANUAL') {
    return input.shareholder || input.holders.some((holder) => holder.userId === input.actorId);
  }
  if (procedure.mechanism === 'SHAREHOLDER_VOTE' || procedure.mechanism === 'COMBINED') {
    return input.shareholder || (procedure.mechanism === 'COMBINED' && officeHolder);
  }
  return officeHolder;
}

export {
  companyHolders,
  decisionProcedures,
  decisionRequirements,
  procedureActor,
  isPersonalShareholder,
  type CurrentCompanyHolder,
};
