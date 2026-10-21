// oxlint-disable import/max-dependencies -- Corporate evidence composes pinned immutable records, current legal-owner participation, exact office intervals and shared Voting results.
import { and, eq } from 'drizzle-orm';
import { companyDecisionApprovals, companyApprovalRevocations, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { approvalsSatisfied } from '../governance/authority';
import { monetaryHash } from '../monetary/domain';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import { decisionRecord, readDecisionPayload } from './decision-store';
import {
  companyHolders,
  decisionProcedures,
  decisionRequirements,
  procedureActor,
} from './decision-authority';
import type { CurrentCompanyHolder } from './decision-authority';
import { companyVotes } from './decision-votes';
import { currentShareholderParticipant } from './shareholder-access';
import { frozenCreatorShareholder } from './decision-frozen-access';

async function companyApprovals(
  transaction: Transaction,
  id: string,
  holders: readonly CurrentCompanyHolder[],
): Promise<
  {
    id: string;
    officeId: string;
    actorId: string;
    holderId: string;
    current: boolean;
    approvedAt: string;
    revokedAt: string | null;
  }[]
> {
  const rows = await transaction
    .select({ approval: companyDecisionApprovals, revocation: companyApprovalRevocations })
    .from(companyDecisionApprovals)
    .leftJoin(
      companyApprovalRevocations,
      eq(companyApprovalRevocations.approvalId, companyDecisionApprovals.id),
    )
    .where(eq(companyDecisionApprovals.decisionId, id));
  return rows.map(({ approval, revocation }) => ({
    id: approval.id,
    officeId: approval.officeId,
    actorId: approval.actorId,
    holderId: approval.holderId,
    approvedAt: approval.approvedAt.toISOString(),
    revokedAt: revocation?.createdAt.toISOString() ?? null,
    current: revocation === null && holders.some((holder) => holder.id === approval.holderId),
  }));
}
interface CompanyProofs {
  record: Awaited<ReturnType<typeof decisionRecord>>;
  company: Awaited<ReturnType<typeof companyRecord>>;
  payload: Awaited<ReturnType<typeof readDecisionPayload>>;
  content: Awaited<ReturnType<typeof readCompanyRevision>>['content'];
  procedures: ReturnType<typeof decisionProcedures>;
  requirements: ReturnType<typeof decisionRequirements>;
  holders: CurrentCompanyHolder[];
  approvals: Awaited<ReturnType<typeof companyApprovals>>;
  votes: Awaited<ReturnType<typeof companyVotes>>;
  stale: boolean;
  ready: boolean;
}
async function creatorAuthorized(
  transaction: Transaction,
  input: Readonly<{ record: CompanyProofs['record']; procedures: CompanyProofs['procedures'] }>,
): Promise<boolean> {
  const { record, procedures } = input;
  const [creator] = await transaction
    .select()
    .from(users)
    .where(and(eq(users.id, record.createdBy), eq(users.status, 'ACTIVE')));
  const shareholder =
    (await currentShareholderParticipant(transaction, record.companyId, record.createdBy)) ||
    (await frozenCreatorShareholder(transaction, record));
  const holders = await companyHolders(transaction, record.companyId, record.id);
  const [primary] = procedures;
  return (
    creator !== undefined &&
    primary !== undefined &&
    procedureActor(primary, { actorId: record.createdBy, shareholder, holders })
  );
}
async function companyDecisionProofs(transaction: Transaction, id: string): Promise<CompanyProofs> {
  const record = await decisionRecord(transaction, id);
  const company = await companyRecord(transaction, record.companyId);
  const { content } = await readCompanyRevision(transaction, record.revisionId);
  const payload = await readDecisionPayload(transaction, record);
  const procedures = decisionProcedures(content.charter, payload);
  const requirements = decisionRequirements(company.id, content.charter, procedures);
  const serving = await companyHolders(transaction, company.id);
  const holders = serving.filter((holder) =>
    content.charter.offices.some((office) => office.id === holder.officeId),
  );
  const stale =
    company.status !== 'ACTIVE' ||
    company.currentRevisionId !== record.revisionId ||
    !(await creatorAuthorized(transaction, { record, procedures }));
  const approvals = await companyApprovals(transaction, id, holders);
  const votes = await companyVotes(transaction, record, requirements);
  const ready =
    !stale &&
    (record.status !== 'APPLIED' ||
      !requirements.manual ||
      (record.manualReason?.trim() ?? '') !== '') &&
    approvalsSatisfied(
      requirements.approvalGroups,
      new Set(
        approvals.filter((approval) => approval.current).map((approval) => approval.officeId),
      ),
    ) &&
    requirements.votes.every((requirement) =>
      votes.some((vote) => vote.requirementHash === monetaryHash(requirement) && vote.approved),
    );
  return {
    record,
    company,
    payload,
    content,
    procedures,
    requirements,
    holders,
    approvals,
    votes,
    stale,
    ready,
  };
}
export { companyDecisionProofs, companyApprovals, type CompanyProofs };
