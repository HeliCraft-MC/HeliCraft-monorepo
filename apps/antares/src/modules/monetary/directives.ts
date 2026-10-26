// oxlint-disable import/max-dependencies -- Decision orchestration composes the existing Governance authority and generic voting services.
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import type { Transaction } from '../permissions/transaction';
import { monetaryDirectives, monetaryApprovals, monetaryVotes, votings } from '../../db/schema';
import { assignmentState } from '../states/office-assignment-context';
import { DomainError, HTTP } from '../errors';
import { DirectiveInputSchema } from './contracts';
import type { DirectiveInput, DirectiveDetail, MonetaryActor } from './contracts';
import { assertExecutable } from './availability';
import { decisionPolicy, monetaryHash, monetaryError } from './domain';
import {
  monetaryActor,
  storePayload,
  storeDirectiveDocument,
  previousDirective,
  currentPolicy,
  monetaryAudit,
  directiveRecord,
} from './store';
import { policyActor } from './evidence';
import { createDirectiveVote } from './votes';
import { directiveContext, assertPending } from './directive-context';
import { applyDirective } from './execute';

class MonetaryDirectiveService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(stateId: string, actor: MonetaryActor, raw: DirectiveInput): Promise<string> {
    return await this.db.transaction(
      async (transaction) =>
        await MonetaryDirectiveService.createInTransaction(transaction, { stateId, actor, raw }),
    );
  }
  // oxlint-disable-next-line max-lines-per-function, max-statements -- Shared decision creation can join its domain's draft submission transaction.
  public static async createInTransaction(
    transaction: Transaction,
    command: Readonly<{ stateId: string; actor: MonetaryActor; raw: DirectiveInput }>,
  ): Promise<string> {
    const { stateId, actor, raw } = command;
    const input = DirectiveInputSchema.parse(raw);
    await monetaryActor(transaction, actor);
    const state = await assignmentState(transaction, stateId, actor);
    const prior = await previousDirective(transaction, actor.id, input.idempotencyKey);
    const hash = monetaryHash(input.payload);
    if (prior) {
      if (prior.stateId !== stateId || prior.payloadHash !== hash) {
        monetaryError('IDEMPOTENCY_CONFLICT', 'Этот ключ уже использован для другого распоряжения');
      }
      return prior.id;
    }
    const policy = decisionPolicy(state.configuration.governance.policies, input.payload.kind);
    if (state.status !== 'ACTIVE' || !policy || !policyActor(state, policy, actor.id)) {
      throw new DomainError(
        HTTP.forbidden,
        'MONETARY_AUTHORITY_REQUIRED',
        'Требуется активное государство и действующее финансовое полномочие Governance',
      );
    }
    await assertExecutable(transaction, stateId, input.payload);
    const current =
      'currencyId' in input.payload
        ? await currentPolicy(transaction, input.payload.currencyId)
        : null;
    const policyRevisionId = current?.id ?? null;
    const id = crypto.randomUUID();
    const stored = await storePayload(transaction, input.payload);
    await transaction.insert(monetaryDirectives).values({
      id,
      stateId,
      governanceRevisionId: state.governanceRevisionId,
      policyRevisionId,
      ...stored,
      payloadHash: hash,
      createdBy: actor.id,
      idempotencyKey: input.idempotencyKey,
      createdAt: sql`clock_timestamp()`,
    });
    await storeDirectiveDocument(transaction, id, input.payload);
    const record = await directiveRecord(transaction, id);
    await createDirectiveVote(transaction, { record, state, policy });
    const context = await directiveContext(transaction, id, actor);
    if (context.detail.votes.length === 0 && !context.detail.manualRequired) {
      const offices = context.detail.approvableOfficeIds;
      if (offices.length > 0) {
        await transaction.insert(monetaryApprovals).values(
          offices.map((officeId) => ({
            directiveId: id,
            officeId,
            actorId: actor.id,
            approvedAt: sql`clock_timestamp()`,
          })),
        );
      }
      const approved = await directiveContext(transaction, id, actor);
      if (approved.detail.canApply) {
        await applyDirective(transaction, { id, actor });
      }
    }
    await monetaryAudit(transaction, {
      actorId: actor.id,
      id,
      action: 'monetary.directive.created',
    });
    return id;
  }
  public async detail(id: string, actor: MonetaryActor): Promise<DirectiveDetail> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const context = await directiveContext(transaction, id, actor);
      return context.detail;
    });
  }
  public async approve(id: string, actor: MonetaryActor, officeId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const { detail } = await directiveContext(transaction, id, actor);
      assertPending(detail);
      if (!detail.approvableOfficeIds.includes(officeId)) {
        throw new DomainError(
          HTTP.forbidden,
          'OFFICE_NOT_AUTHORIZED',
          'Эта должность не позволяет одобрить распоряжение',
        );
      }
      await transaction
        .insert(monetaryApprovals)
        .values({
          directiveId: id,
          officeId,
          actorId: actor.id,
          approvedAt: sql`clock_timestamp()`,
        })
        .onConflictDoUpdate({
          target: [
            monetaryApprovals.directiveId,
            monetaryApprovals.officeId,
            monetaryApprovals.actorId,
          ],
          set: { approvedAt: sql`clock_timestamp()` },
        });
      await monetaryAudit(transaction, {
        actorId: actor.id,
        id,
        action: 'monetary.directive.approved',
        reason: officeId,
      });
    });
  }
  public async revoke(id: string, actor: MonetaryActor, officeId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const { detail } = await directiveContext(transaction, id, actor);
      assertPending(detail);
      await transaction
        .delete(monetaryApprovals)
        .where(
          and(
            eq(monetaryApprovals.directiveId, id),
            eq(monetaryApprovals.officeId, officeId),
            eq(monetaryApprovals.actorId, actor.id),
          ),
        );
      await monetaryAudit(transaction, {
        actorId: actor.id,
        id,
        action: 'monetary.directive.approval_revoked',
        reason: officeId,
      });
    });
  }
  public async apply(id: string, actor: MonetaryActor, reason?: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await applyDirective(transaction, { id, actor, reason });
    });
  }
  public async cancel(id: string, actor: MonetaryActor): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const { record } = await directiveContext(transaction, id, actor);
      if (record.status !== 'PENDING' || (record.createdBy !== actor.id && !actor.admin)) {
        throw new DomainError(
          HTTP.forbidden,
          'CANNOT_CANCEL_DIRECTIVE',
          'Отменить распоряжение может автор или администрация до исполнения',
        );
      }
      const [link] = await transaction
        .select()
        .from(monetaryVotes)
        .where(eq(monetaryVotes.directiveId, id));
      if (link) {
        await transaction
          .update(votings)
          .set({ status: 'CANCELLED' })
          .where(
            and(
              eq(votings.id, link.votingId),
              sql`${votings.status} in ('DRAFT', 'SCHEDULED', 'OPEN')`,
            ),
          );
      }
      await transaction
        .update(monetaryDirectives)
        .set({ status: 'CANCELLED' })
        .where(eq(monetaryDirectives.id, id));
      await monetaryAudit(transaction, {
        actorId: actor.id,
        id,
        action: 'monetary.directive.cancelled',
      });
    });
  }
}
export { MonetaryDirectiveService };
