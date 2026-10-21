import { desc, eq } from 'drizzle-orm';
import {
  companyBranchEvents,
  companyBranchApplications,
  companyDecisions,
  monetaryDirectives,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readDecisionPayload } from './decision-store';
import type { BranchRecord, BranchApplicationRecord } from './branch-context';
import type { BranchApplicationView, BranchHistory, BranchSummary } from './branch-read-contracts';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { DirectivePayload } from '../monetary/contracts';

const PAGE_SIZE = 20;
function branchEventReason(
  company: CompanyDecisionPayload | null,
  state: DirectivePayload | null,
): string | null {
  if (company?.kind === 'CLOSE_BRANCH') {
    return company.reason;
  }
  return state?.kind === 'REVIEW_COMPANY_BRANCH' ? state.reason : null;
}
async function branchApplicationView(
  transaction: Transaction,
  application: BranchApplicationRecord,
): Promise<BranchApplicationView> {
  const [decision] = await transaction
    .select()
    .from(companyDecisions)
    .where(eq(companyDecisions.id, application.id));
  if (!decision) {
    throw new Error('Branch source decision missing');
  }
  const payload = await readDecisionPayload(transaction, decision);
  if (
    payload.kind !== 'REGISTER_BRANCH' ||
    payload.branchId !== application.branchId ||
    payload.policyRevisionId !== application.policyRevisionId ||
    decision.status !== 'APPLIED'
  ) {
    throw new Error('Immutable branch application source integrity failure');
  }
  return {
    id: application.id,
    branchId: application.branchId,
    policyRevisionId: application.policyRevisionId,
    companyRevisionId: decision.revisionId,
    status: application.status,
    name: payload.name,
    description: payload.description,
    createdBy: decision.createdBy,
    createdAt: application.createdAt.toISOString(),
    reviewDirectiveId: application.reviewDirectiveId,
    completionDecisionId: application.completionDecisionId,
    reviewedBy: application.reviewedBy,
    reviewReason: application.reviewReason,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  };
}
async function branchSummary(
  transaction: Transaction,
  branch: BranchRecord,
): Promise<BranchSummary> {
  const [current] = await transaction
    .select()
    .from(companyBranchApplications)
    .where(eq(companyBranchApplications.id, branch.currentApplicationId));
  if (!current) {
    throw new Error('Branch current application missing');
  }
  const view = await branchApplicationView(transaction, current);
  return {
    id: branch.id,
    companyId: branch.companyId,
    stateId: branch.stateId,
    status: branch.status,
    currentApplicationId: branch.currentApplicationId,
    name: view.name,
    description: view.description,
    createdAt: branch.createdAt.toISOString(),
  };
}
async function branchHistory(
  transaction: Transaction,
  id: string,
  page: number,
): Promise<BranchHistory> {
  const rows = await transaction
    .select({
      event: companyBranchEvents,
      company: companyDecisions.payload,
      state: monetaryDirectives.payload,
    })
    .from(companyBranchEvents)
    .leftJoin(companyDecisions, eq(companyDecisions.id, companyBranchEvents.companyDecisionId))
    .leftJoin(monetaryDirectives, eq(monetaryDirectives.id, companyBranchEvents.stateDirectiveId))
    .where(eq(companyBranchEvents.branchId, id))
    .orderBy(desc(companyBranchEvents.createdAt), desc(companyBranchEvents.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  return {
    page,
    hasMore: rows.length > PAGE_SIZE,
    items: rows.slice(0, PAGE_SIZE).map(({ event, company, state }) => ({
      id: event.id,
      applicationId: event.applicationId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actorId: event.actorId,
      companyDecisionId: event.companyDecisionId,
      stateDirectiveId: event.stateDirectiveId,
      reason: branchEventReason(company, state),
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
export { branchApplicationView, branchSummary, branchHistory, PAGE_SIZE };
