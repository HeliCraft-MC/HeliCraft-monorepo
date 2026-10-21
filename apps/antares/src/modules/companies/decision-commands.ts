// oxlint-disable import/max-dependencies -- Corporate orchestration composes immutable payload storage, domain authorization, generic voting and execution.
import { and, eq, sql } from 'drizzle-orm';
import { companyDecisions, companyDecisionApprovals } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryHash } from '../monetary/domain';
import type { CompanyDecisionInput, CompanyActor } from './decision-contracts';
import { companyActor, companyRecord, companyAudit } from './store';
import { readCompanyRevision } from './revisions';
import { decisionRecord, storeDecisionPayload } from './decision-store';
import { extractDecisionTexts } from './decision-texts';
import { companyDecisionProofs } from './decision-proofs';
import type { CompanyProofs } from './decision-proofs';
import {
  companyHolders,
  decisionProcedures,
  decisionRequirements,
  procedureActor,
} from './decision-authority';
import { createCompanyVotes } from './decision-votes';
import { assertCompanyAction, executeCompanyAction } from './decision-execution';
import { currentShareholderParticipant } from './shareholder-access';
import { assertCorporateProposalQuote } from './payment-quote';

async function corporateActor(transaction: Transaction, actor: CompanyActor): Promise<void> {
  await companyActor(transaction, actor.id);
  if (actor.admin) {
    await authorizeMutation(transaction, actor.id, 'states.manage');
  }
}
async function actorMayApply(
  transaction: Transaction,
  proof: CompanyProofs,
  actor: CompanyActor,
): Promise<boolean> {
  const [primary] = proof.procedures;
  return proof.requirements.manual
    ? actor.admin
    : primary !== undefined &&
        procedureActor(primary, {
          actorId: actor.id,
          shareholder: await currentShareholderParticipant(transaction, proof.company.id, actor.id),
          holders: proof.holders,
        });
}
async function applyCompanyDecision(
  transaction: Transaction,
  input: Readonly<{ id: string; actor: CompanyActor; reason?: string }>,
): Promise<void> {
  const proof = await companyDecisionProofs(transaction, input.id);
  if (proof.record.status === 'APPLIED') {
    return;
  }
  if (
    proof.record.status !== 'PENDING' ||
    proof.stale ||
    !proof.ready ||
    !(await actorMayApply(transaction, proof, input.actor)) ||
    (proof.requirements.manual && (input.reason?.trim() ?? '') === '')
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_DECISION_NOT_APPROVED',
      'Требуются действующие полномочия, одобрения, завершённые голосования и предусмотренная ручная проверка',
    );
  }
  await executeCompanyAction(transaction, { proof, actorId: input.actor.id });
  await transaction
    .update(companyDecisions)
    .set({
      status: 'APPLIED',
      appliedAt: sql`clock_timestamp()`,
      appliedBy: input.actor.id,
      manualReason: proof.requirements.manual ? input.reason?.trim() : null,
    })
    .where(eq(companyDecisions.id, input.id));
  await companyAudit(transaction, {
    companyId: proof.company.id,
    actorId: input.actor.id,
    action: 'company.decision.applied',
    reason: input.id,
  });
}
async function addOfficeApproval(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; actorId: string; officeId: string }>,
): Promise<void> {
  const { proof, actorId, officeId } = input;
  const holder = proof.holders.find(
    (candidate) => candidate.officeId === officeId && candidate.userId === actorId,
  );
  if (
    proof.record.status !== 'PENDING' ||
    proof.stale ||
    !holder ||
    !proof.requirements.approvalGroups.some((group) => group.officeIds.includes(officeId))
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'COMPANY_APPROVAL_UNAVAILABLE',
      'Эта должность не позволяет одобрить актуальное решение',
    );
  }
  if (proof.approvals.some((approval) => approval.current && approval.holderId === holder.id)) {
    return;
  }
  await transaction.insert(companyDecisionApprovals).values({
    decisionId: proof.record.id,
    officeId,
    actorId,
    holderId: holder.id,
    approvedAt: sql`clock_timestamp()`,
  });
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- An immutable proposal, normalized text, frozen generic votes and optional immediate execution form one atomic command.
async function createCompanyDecision(
  transaction: Transaction,
  input: Readonly<{ companyId: string; actor: CompanyActor; command: CompanyDecisionInput }>,
): Promise<string> {
  const { companyId, actor, command } = input;
  const hash = monetaryHash(command.payload);
  const [previous] = await transaction
    .select()
    .from(companyDecisions)
    .where(
      and(
        eq(companyDecisions.createdBy, actor.id),
        eq(companyDecisions.idempotencyKey, command.idempotencyKey),
      ),
    );
  if (previous) {
    if (
      previous.companyId !== companyId ||
      previous.revisionId !== command.revisionId ||
      previous.payloadHash !== hash
    ) {
      throw new DomainError(
        HTTP.conflict,
        'IDEMPOTENCY_CONFLICT',
        'Этот ключ использован для другого корпоративного решения',
      );
    }
    return previous.id;
  }
  const company = await companyRecord(transaction, companyId);
  if (company.status !== 'ACTIVE' || company.currentRevisionId !== command.revisionId) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_CHARTER_STALE',
      'Компания не активна или редакция устава изменилась',
    );
  }
  const { content } = await readCompanyRevision(transaction, command.revisionId);
  const procedures = decisionProcedures(content.charter, command.payload);
  const holders = await companyHolders(transaction, company.id);
  const [primary] = procedures;
  if (
    primary === undefined ||
    !procedureActor(primary, {
      actorId: actor.id,
      shareholder: await currentShareholderParticipant(transaction, company.id, actor.id),
      holders,
    })
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'COMPANY_AUTHORITY_REQUIRED',
      'Требуется корпоративное полномочие по действующему уставу',
    );
  }
  await assertCompanyAction(transaction, { companyId, content, payload: command.payload });
  if (command.payload.kind === 'TRANSFER_FUNDS') {
    await assertCorporateProposalQuote(transaction, {
      companyId,
      revisionId: command.revisionId,
      actorId: actor.id,
      payload: command.payload,
    });
  }
  const id = crypto.randomUUID();
  await transaction.insert(companyDecisions).values({
    id,
    companyId,
    revisionId: command.revisionId,
    payload: extractDecisionTexts(command.payload).machine,
    payloadHash: hash,
    createdBy: actor.id,
    taxQuoteId:
      command.payload.kind === 'TRANSFER_FUNDS' ? (command.payload.quoteId ?? null) : null,
    idempotencyKey: command.idempotencyKey,
    createdAt: sql`clock_timestamp()`,
  });
  await storeDecisionPayload(transaction, id, command.payload);
  const record = await decisionRecord(transaction, id);
  await createCompanyVotes(
    transaction,
    record,
    decisionRequirements(companyId, content.charter, procedures),
  );
  const proof = await companyDecisionProofs(transaction, id);
  const offices = new Set(proof.requirements.approvalGroups.flatMap((group) => group.officeIds));
  for (const holder of holders.filter(
    (candidate) => candidate.userId === actor.id && offices.has(candidate.officeId),
  )) {
    // oxlint-disable-next-line no-await-in-loop -- Each signature pins that actor's exact current appointment interval in the proposal transaction.
    await addOfficeApproval(transaction, {
      // oxlint-disable-next-line no-await-in-loop -- Refresh prior signatures on the same serialized evidence connection.
      proof: await companyDecisionProofs(transaction, id),
      actorId: actor.id,
      officeId: holder.officeId,
    });
  }
  const approved = await companyDecisionProofs(transaction, id);
  if (approved.ready && !approved.requirements.manual && approved.requirements.votes.length === 0) {
    await applyCompanyDecision(transaction, { id, actor });
  }
  await companyAudit(transaction, {
    companyId,
    actorId: actor.id,
    action: 'company.decision.created',
    reason: id,
  });
  return id;
}
export {
  corporateActor,
  createCompanyDecision,
  applyCompanyDecision,
  addOfficeApproval,
  actorMayApply,
};
