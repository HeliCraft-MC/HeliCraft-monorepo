// oxlint-disable import/max-dependencies -- Approved corporate commands dispatch to charter, office, founding and shared voting domain services on one transaction.
import { and, eq, isNull, sql } from 'drizzle-orm';
import { companyDrafts, companyFormationConsents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertEntityBallot } from '../voting/entity-ballots';
import { castBallotInTransaction } from '../voting/ballots';
import type { CompanyProofs } from './decision-proofs';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { CompanyRevisionContent } from './contracts';
import { companyRecord, ensureSubject } from './store';
import { formationHash } from './drafts';
import { assertCompanyFormation } from './domain';
import { validateCharterAction, assertCharterRoster, applyCharterAction } from './charter-actions';
import { assertOfficeAction, applyOfficeAction } from './office-actions';
import {
  isRelatedCompanyAction,
  assertRelatedCompanyAction,
  executeRelatedCompanyAction,
} from './related-actions';

async function assertCompanyFounding(
  transaction: Transaction,
  companyId: string,
  payload: Extract<CompanyDecisionPayload, { kind: 'FOUND_COMPANY' }>,
): Promise<void> {
  const target = await companyRecord(transaction, payload.companyId);
  const [draft] = await transaction
    .select()
    .from(companyDrafts)
    .where(and(eq(companyDrafts.companyId, target.id), isNull(companyDrafts.deletedAt)))
    .orderBy(sql`${companyDrafts.updatedAt} desc`)
    .limit(1);
  if (
    !draft ||
    !['DRAFT', 'PENDING_REGISTRATION', 'REJECTED'].includes(target.status) ||
    formationHash(target.id, draft.configuration) !== payload.formationHash ||
    !draft.configuration.allocations.some(
      (allocation) => allocation.owner.type === 'COMPANY' && allocation.owner.id === companyId,
    )
  ) {
    throw new DomainError(
      HTTP.conflict,
      'CORPORATE_FOUNDING_STALE',
      'Условия учреждения или корпоративное участие изменились',
    );
  }
  assertCompanyFormation(draft.configuration);
}
function unavailableCompanyAction(kind: CompanyDecisionPayload['kind']): never {
  if (kind === 'CLOSE_COMPANY') {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_LIQUIDATION_REQUIRED',
      'Закрытие учреждённой компании требует будущей процедуры погашения капитала и распределения активов',
    );
  }
  throw new DomainError(
    HTTP.conflict,
    'COMPANY_ACTION_NOT_IMPLEMENTED',
    'Это корпоративное действие ещё недоступно',
  );
}
async function assertCompanyAction(
  transaction: Transaction,
  input: Readonly<{
    companyId: string;
    content: CompanyRevisionContent;
    payload: CompanyDecisionPayload;
  }>,
): Promise<void> {
  const { payload, companyId, content } = input;
  if (isRelatedCompanyAction(payload)) {
    await assertRelatedCompanyAction(transaction, companyId, payload);
    return;
  }
  switch (payload.kind) {
    case 'AMEND_CHARTER':
    case 'UPDATE_PROFILE':
    case 'CREATE_OFFICE':
    case 'UPDATE_OFFICE': {
      await assertCharterRoster(transaction, companyId, validateCharterAction(content, payload));
      return;
    }
    case 'APPOINT_OFFICE_HOLDER':
    case 'REMOVE_OFFICE_HOLDER': {
      await assertOfficeAction(transaction, { companyId, content, payload });
      return;
    }
    case 'FOUND_COMPANY': {
      await assertCompanyFounding(transaction, companyId, payload);
      return;
    }
    case 'VOTE_AS_SHAREHOLDER': {
      await assertEntityBallot(transaction, companyId, payload);
      return;
    }
    case 'CLOSE_COMPANY': {
      return unavailableCompanyAction(payload.kind);
    }
    default: {
      throw new Error('Unknown corporate action');
    }
  }
}
async function recordCompanyFounding(
  transaction: Transaction,
  proof: CompanyProofs,
  payload: Extract<CompanyDecisionPayload, { kind: 'FOUND_COMPANY' }>,
): Promise<void> {
  const { company, record } = proof;
  const subjectId = await ensureSubject(transaction, { type: 'COMPANY', id: company.id });
  await transaction.insert(companyFormationConsents).values({
    companyId: payload.companyId,
    formationHash: payload.formationHash,
    role: 'FOUNDER',
    subjectId,
    actorId: record.createdBy,
    companyDecisionId: record.id,
    idempotencyKey: record.id,
    createdAt: sql`clock_timestamp()`,
  });
}
// oxlint-disable-next-line max-lines-per-function -- Approved charter, appointment, consent or shared ballot effects execute atomically before marking their source decision applied.
async function executeCompanyAction(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; actorId: string }>,
): Promise<void> {
  const { proof, actorId } = input;
  const { payload, content, company, record } = proof;
  await assertCompanyAction(transaction, { companyId: company.id, content, payload });
  if (isRelatedCompanyAction(payload)) {
    await executeRelatedCompanyAction(transaction, { proof, payload, actorId });
    return;
  }
  switch (payload.kind) {
    case 'AMEND_CHARTER':
    case 'UPDATE_PROFILE':
    case 'CREATE_OFFICE':
    case 'UPDATE_OFFICE': {
      await applyCharterAction(transaction, {
        companyId: company.id,
        actorId,
        decisionId: record.id,
        content,
        payload,
      });
      return;
    }
    case 'APPOINT_OFFICE_HOLDER':
    case 'REMOVE_OFFICE_HOLDER': {
      await applyOfficeAction(transaction, {
        companyId: company.id,
        revisionId: record.revisionId,
        content,
        payload,
      });
      return;
    }
    case 'FOUND_COMPANY': {
      await recordCompanyFounding(transaction, proof, payload);
      return;
    }
    case 'VOTE_AS_SHAREHOLDER': {
      await castBallotInTransaction(transaction, {
        id: payload.votingId,
        actorId,
        voterId: company.id,
        ballot: payload,
        source: { companyDecisionId: record.id },
      });
      return;
    }
    case 'CLOSE_COMPANY': {
      throw new Error('Unavailable company action passed validation');
    }
    default: {
      throw new Error('Unknown corporate action');
    }
  }
}
export { assertCompanyAction, executeCompanyAction };
