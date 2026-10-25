// oxlint-disable import/max-dependencies -- Decision task projections reuse the authorized state and corporate decision capabilities.
import { and, asc, eq, gt } from 'drizzle-orm';
import {
  companyDecisions,
  monetaryDirectives,
  companyRegistrationApplications,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { assignmentState } from '../states/office-assignment-context';
import { decisionPolicy } from '../monetary/domain';
import { policyActor } from '../monetary/evidence';
import { directiveContext } from '../monetary/directive-context';
import { authorizedCompanyProof, companyDecisionDetail } from './decision-detail';
import { readCompanyRevision } from './revisions';
import { inaccessible } from './inbox-authority';
import type { CompanyInboxItem, CompanyInboxKind, CompanyInboxPage } from './inbox-contracts';

import { INBOX_SCAN_SIZE, inboxPage } from './inbox-page';

async function registrationInbox(
  transaction: Transaction,
  actorId: string,
  after?: string,
): Promise<CompanyInboxPage> {
  const rows = await transaction
    .select()
    .from(companyRegistrationApplications)
    .where(
      and(
        eq(companyRegistrationApplications.status, 'PENDING'),
        after === undefined ? undefined : gt(companyRegistrationApplications.id, after),
      ),
    )
    .orderBy(asc(companyRegistrationApplications.id))
    .limit(INBOX_SCAN_SIZE);
  const items: CompanyInboxItem[] = [];
  for (const row of rows) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- Each registration is authorized against the current state policy on one connection.
      const state = await assignmentState(transaction, row.stateId, { id: actorId, admin: false });
      const policy = decisionPolicy(
        state.configuration.governance.policies,
        'REVIEW_COMPANY_REGISTRATION',
      );
      if (
        state.status === 'ACTIVE' &&
        policy !== undefined &&
        policyActor(state, policy, actorId)
      ) {
        // oxlint-disable-next-line no-await-in-loop -- The application name comes from its pinned immutable revision.
        const { content } = await readCompanyRevision(transaction, row.revisionId);
        items.push({
          id: row.id,
          title: content.name,
          action: 'REGISTRATION_REVIEW',
          href: `/app/state-company-applications/${row.id}`,
        });
      }
    } catch (error) {
      if (!inaccessible(error)) {
        throw error;
      }
    }
  }
  return inboxPage(rows, items);
}
interface DecisionCapabilities {
  readonly stale: boolean;
  readonly canApply: boolean;
  readonly approvableOfficeIds: readonly string[];
  readonly approvals: readonly {
    readonly officeId: string;
    readonly actorId: string;
    readonly current: boolean;
  }[];
}
function needsDecisionAction(detail: DecisionCapabilities, actorId: string): boolean {
  return (
    !detail.stale &&
    (detail.canApply ||
      detail.approvableOfficeIds.some(
        (officeId) =>
          !detail.approvals.some(
            (approval) =>
              approval.officeId === officeId && approval.actorId === actorId && approval.current,
          ),
      ))
  );
}
async function stateDecisionTask(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<CompanyInboxItem | null> {
  const { detail } = await directiveContext(transaction, id, { id: actorId, admin: false });
  return needsDecisionAction(detail, actorId)
    ? { id, title: {}, action: detail.payload.kind, href: `/app/state-decisions/${id}` }
    : null;
}
async function companyDecisionTask(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<CompanyInboxItem | null> {
  const actor = { id: actorId, admin: false };
  const proof = await authorizedCompanyProof(transaction, id, actor);
  const detail = await companyDecisionDetail(transaction, { proof, actor });
  return needsDecisionAction(detail, actorId)
    ? { id, title: proof.content.name, action: detail.kind, href: `/app/company-decisions/${id}` }
    : null;
}
async function decisionInbox(
  transaction: Transaction,
  input: Readonly<{ actorId: string; kind: CompanyInboxKind; after?: string }>,
): Promise<CompanyInboxPage> {
  const { actorId, kind, after } = input;
  const table = kind === 'STATE_DECISION' ? monetaryDirectives : companyDecisions;
  const rows = await transaction
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.status, 'PENDING'), after === undefined ? undefined : gt(table.id, after)))
    .orderBy(asc(table.id))
    .limit(INBOX_SCAN_SIZE);
  const read = kind === 'STATE_DECISION' ? stateDecisionTask : companyDecisionTask;
  const items: CompanyInboxItem[] = [];
  for (const row of rows) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- The existing authorized projection supplies current approval and execution capabilities on one connection.
      const task = await read(transaction, row.id, actorId);
      if (task !== null) {
        items.push(task);
      }
    } catch (error) {
      if (!inaccessible(error)) {
        throw error;
      }
    }
  }
  return inboxPage(rows, items);
}
export { registrationInbox, decisionInbox };
