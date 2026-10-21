// oxlint-disable import/max-dependencies -- The service exposes separate atomic command helpers and allowlisted protected read DTOs.
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companyDecisions,
  companyDecisionApprovals,
  companyApprovalRevocations,
  companyDecisionVotes,
  votings,
} from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import { CompanyDecisionInputSchema } from './decision-contracts';
import type { CompanyActor, CompanyDecisionInput } from './decision-contracts';
import { decisionRecord } from './decision-store';
import { companyDecisionProofs } from './decision-proofs';
import type { CompanyProofs } from './decision-proofs';
import {
  companyDecisionDetail,
  companyDecisionSummary,
  authorizedCompanyProof,
} from './decision-detail';
import { assertCompanyReader } from './workspace-read';
import type { CompanyDecisionDetail, CompanyDecisionSummary } from './read-contracts';
import {
  corporateActor,
  createCompanyDecision,
  applyCompanyDecision,
  addOfficeApproval,
} from './decision-commands';

class CompanyDecisionService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(
    companyId: string,
    actor: CompanyActor,
    input: CompanyDecisionInput,
  ): Promise<string> {
    const command = CompanyDecisionInputSchema.parse(input);
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      return await createCompanyDecision(transaction, { companyId, actor, command });
    });
  }
  public async proof(id: string, actor: CompanyActor): Promise<CompanyProofs> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      return await authorizedCompanyProof(transaction, id, actor);
    });
  }
  public async detail(id: string, actor: CompanyActor): Promise<CompanyDecisionDetail> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      return await companyDecisionDetail(transaction, {
        proof: await authorizedCompanyProof(transaction, id, actor),
        actor,
      });
    });
  }
  public async list(
    companyId: string,
    actor: CompanyActor,
    page = 1,
  ): Promise<{ items: CompanyDecisionSummary[]; page: number; hasMore: boolean }> {
    const pageSize = 20;
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyReader(transaction, companyId, actor);
      const rows = await transaction
        .select()
        .from(companyDecisions)
        .where(eq(companyDecisions.companyId, companyId))
        .orderBy(desc(companyDecisions.createdAt), desc(companyDecisions.id))
        .limit(pageSize + 1)
        .offset((page - 1) * pageSize);
      return {
        items: rows.slice(0, pageSize).map((record) => companyDecisionSummary(record)),
        page,
        hasMore: rows.length > pageSize,
      };
    });
  }
  public async approve(id: string, actor: CompanyActor, officeId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await addOfficeApproval(transaction, {
        proof: await companyDecisionProofs(transaction, id),
        actorId: actor.id,
        officeId,
      });
    });
  }
  public async revoke(id: string, actor: CompanyActor, approvalId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const record = await decisionRecord(transaction, id);
      const [approval] = await transaction
        .select()
        .from(companyDecisionApprovals)
        .where(
          and(
            eq(companyDecisionApprovals.id, approvalId),
            eq(companyDecisionApprovals.decisionId, id),
            eq(companyDecisionApprovals.actorId, actor.id),
          ),
        );
      if (record.status !== 'PENDING' || !approval) {
        throw new DomainError(
          HTTP.forbidden,
          'COMPANY_REVOCATION_UNAVAILABLE',
          'Отозвать можно только собственную подпись до исполнения',
        );
      }
      await transaction
        .insert(companyApprovalRevocations)
        .values({ approvalId, actorId: actor.id })
        .onConflictDoNothing();
    });
  }
  public async apply(id: string, actor: CompanyActor, reason?: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await applyCompanyDecision(transaction, { id, actor, reason });
    });
  }
  public async cancel(id: string, actor: CompanyActor): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const record = await decisionRecord(transaction, id);
      if (record.status !== 'PENDING' || (!actor.admin && record.createdBy !== actor.id)) {
        throw new DomainError(
          HTTP.forbidden,
          'COMPANY_CANCELLATION_UNAVAILABLE',
          'Отменить решение может автор или администрация до исполнения',
        );
      }
      const links = await transaction
        .select()
        .from(companyDecisionVotes)
        .where(eq(companyDecisionVotes.decisionId, id));
      for (const link of links) {
        // oxlint-disable-next-line no-await-in-loop -- Linked voting transitions remain in the same cancellation transaction.
        await transaction
          .update(votings)
          .set({ status: 'CANCELLED' })
          .where(
            and(
              eq(votings.id, link.votingId),
              sql`${votings.status} in ('DRAFT','SCHEDULED','OPEN')`,
            ),
          );
      }
      await transaction
        .update(companyDecisions)
        .set({ status: 'CANCELLED' })
        .where(eq(companyDecisions.id, id));
    });
  }
}
export { CompanyDecisionService };
