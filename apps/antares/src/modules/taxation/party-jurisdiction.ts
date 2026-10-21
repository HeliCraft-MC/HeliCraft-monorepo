import { eq } from 'drizzle-orm';
import { companies, companyBranches, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import { jurisdictionMemberships, resolveJurisdiction } from './jurisdiction';
import type { TaxRule, TaxEvidence } from './contracts';
import type { FinancialParty } from './participants';

interface PartyJurisdiction {
  readonly party: FinancialParty;
  readonly memberships: Awaited<ReturnType<typeof jurisdictionMemberships>>;
  readonly company: { stateId: string; registeredAt: string } | null;
  readonly branch: { id: string; stateId: string; applicationId: string } | null;
}
async function financialBranchContext(
  transaction: Transaction,
  companyId: string,
  branchId: string,
): Promise<PartyJurisdiction['branch']> {
  const [branch] = await transaction
    .select({ branch: companyBranches, host: states.status })
    .from(companyBranches)
    .innerJoin(states, eq(states.id, companyBranches.stateId))
    .where(eq(companyBranches.id, branchId));
  if (
    !branch ||
    branch.branch.companyId !== companyId ||
    branch.branch.status !== 'ACTIVE' ||
    branch.host !== 'ACTIVE'
  ) {
    monetaryError(
      'COMPANY_BRANCH_CONTEXT_UNAVAILABLE',
      'Для финансового контекста требуется действительный активный филиал этой компании',
    );
  }
  return branch.host === 'ACTIVE'
    ? {
        id: branch.branch.id,
        stateId: branch.branch.stateId,
        applicationId: branch.branch.currentApplicationId,
      }
    : null;
}
async function partyJurisdiction(
  transaction: Transaction,
  party: FinancialParty,
  sourceBranchId?: string,
): Promise<PartyJurisdiction> {
  if (party.kind === 'PLAYER') {
    return {
      party,
      memberships: await jurisdictionMemberships(transaction, party.id),
      company: null,
      branch: null,
    };
  }
  const [company] = await transaction.select().from(companies).where(eq(companies.id, party.id));
  if (!company || company.foundedAt === null || company.registrationStateId === null) {
    monetaryError('COMPANY_JURISDICTION_MISSING', 'Нет подтверждённой регистрации компании');
  }
  const [state] = await transaction
    .select({ status: states.status })
    .from(states)
    .where(eq(states.id, company.registrationStateId));
  const branch =
    sourceBranchId === undefined
      ? null
      : await financialBranchContext(transaction, party.id, sourceBranchId);
  return {
    party,
    memberships: [],
    company:
      state?.status === 'ACTIVE'
        ? { stateId: company.registrationStateId, registeredAt: company.foundedAt.toISOString() }
        : null,
    branch,
  };
}
function resolvePartyJurisdiction(
  stateId: string,
  rule: TaxRule,
  context: PartyJurisdiction,
): TaxEvidence[] {
  if (context.party.kind === 'PLAYER') {
    return resolveJurisdiction(stateId, rule, context.memberships);
  }
  const evidence: TaxEvidence[] = [];
  if (context.company?.stateId === stateId && rule.jurisdictions.includes('COMPANY_REGISTRATION')) {
    evidence.push({
      stateId,
      basis: 'COMPANY_REGISTRATION',
      source: 'COMPANY_REGISTRATION',
      companyId: context.party.id,
      registeredAt: context.company.registeredAt,
    });
  }
  if (context.branch?.stateId === stateId && rule.jurisdictions.includes('BRANCH_REGISTRATION')) {
    evidence.push({
      stateId,
      basis: 'BRANCH_REGISTRATION',
      source: 'APPROVED_CORPORATE_BRANCH_CONTEXT',
      companyId: context.party.id,
      branchId: context.branch.id,
      applicationId: context.branch.applicationId,
    });
  }
  return evidence;
}
export { partyJurisdiction, resolvePartyJurisdiction, type PartyJurisdiction };
