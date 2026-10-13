// oxlint-disable max-lines -- Cohesive domain contract or composed editor; validation, persistence and individual controls are separate modules.
// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { holderHasAuthority } from './office-authority';
import { lockedDraft } from './drafts';
import { configurationHash } from './configuration-hash';
import { ensureReformProposal } from './proposal-store';
import { requireCitizen, contextForDraft } from './reform-context';
import { publishReformRevision } from './reform-publication';
import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  stateReformApprovals,
  stateReformVotes,
  stateReformProposals,
  stateOfficeHolders,
  stateDrafts,
} from '../../db/schema';

import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { VotingService } from '../voting/service';
import { persistVoting, publishVoting } from '../voting/persistence';
import { stateRecord } from './persistence';
import { readRevision } from './revisions';

import type { StateConfiguration } from './contracts';

const HOUR_MS = 3_600_000;

class StateReformService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(stateId: string, actorId: string): Promise<string> {
    return await this.db.transaction(async (transaction) => {
      await requireCitizen(transaction, stateId, actorId);
      const state = await stateRecord(transaction, stateId);
      if (state.status !== 'ACTIVE' || state.currentRevisionId === null) {
        throw new DomainError(HTTP.conflict, 'STATE_INACTIVE', 'Государство не активно');
      }
      const current = await readRevision(transaction, state.currentRevisionId);
      const id = crypto.randomUUID();
      await transaction.insert(stateDrafts).values({
        id,
        ownerId: actorId,
        stateId,
        baseRevisionId: state.currentRevisionId,
        title: 'Governance reform',
        configuration: current.configuration,
      });
      return id;
    });
  }
  public async propose(draftId: string, actorId: string, version: number): Promise<string> {
    return await this.db.transaction(async (transaction) => {
      const context = await contextForDraft(transaction, { draftId, ownerId: actorId, version });
      await requireCitizen(transaction, context.state.id, actorId);
      return await ensureReformProposal(transaction, context);
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Proposal normalization and generic voting publication commit atomically.
  public async startVote(draftId: string, actorId: string, version: number): Promise<string> {
    // oxlint-disable-next-line max-lines-per-function -- Vote/publication approval must stay within the locked transaction.
    return await this.db.transaction(async (transaction) => {
      const context = await contextForDraft(transaction, {
        draftId,
        ownerId: actorId,
        version,
      });
      await requireCitizen(transaction, context.state.id, actorId);
      if (!['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(context.policy.mechanism)) {
        throw new DomainError(
          HTTP.badRequest,
          'VOTE_NOT_REQUIRED',
          'Эта процедура не требует голосования',
        );
      }
      const proposalId = await ensureReformProposal(transaction, context);
      const [proposal] = await transaction
        .select()
        .from(stateReformProposals)
        .where(eq(stateReformProposals.id, proposalId));
      if (!proposal) {
        throw new Error('Proposal missing');
      }
      const [existing] = await transaction
        .select()
        .from(stateReformVotes)
        .where(
          and(
            eq(stateReformVotes.draftId, draftId),
            eq(stateReformVotes.version, proposal.version),
          ),
        );
      if (existing) {
        return existing.votingId;
      }
      const rules = context.policy.vote ?? context.current.governance.votingDefaults;
      const yes = crypto.randomUUID();
      const id = await persistVoting(transaction, actorId, {
        title: { ru: 'Реформа государственного устройства', en: 'Governance reform' },
        description: {
          ru: 'Предложение об изменении действующего государственного устройства',
          en: 'Proposal to amend the current governance',
        },
        options: [
          { id: yes, label: { ru: 'Одобрить', en: 'Approve' } },
          { id: crypto.randomUUID(), label: { ru: 'Отклонить', en: 'Reject' } },
        ],
        electorate:
          context.policy.mechanism === 'COUNCIL_VOTE'
            ? {
                type: 'OFFICE_HOLDERS',
                stateId: context.state.id,
                officeIds: context.policy.officeIds,
              }
            : { type: 'STATE_CITIZENS', stateId: context.state.id },
        rules,
        opensAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + rules.durationHours * HOUR_MS).toISOString(),
        maxSelections: 1,
        resultVisibility: 'AFTER_CLOSE',
      });
      await publishVoting(transaction, id, {
        governanceRevisionId: context.state.currentRevisionId ?? undefined,
        subject: { type: 'STATE_REFORM', id: proposalId, version: proposal.version },
      });
      await transaction.insert(stateReformVotes).values({
        draftId,
        version: proposal.version,
        votingId: id,
        approvalOptionId: yes,
        configuration: proposal.configuration,
      });
      return id;
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Authority is checked against the current revision and exact immutable proposal.
  public async approveOffice(
    input: Readonly<{ draftId: string; ownerId: string; version: number; officeId: string }>,
    actorId: string,
  ): Promise<void> {
    // oxlint-disable-next-line max-lines-per-function -- Proposal and holder authority are checked under the same draft and state locks.
    await this.db.transaction(async (transaction) => {
      const draft = await lockedDraft(transaction, input.draftId, input.ownerId);
      const context = await contextForDraft(transaction, {
        draftId: input.draftId,
        ownerId: input.ownerId,
        version: draft.version,
      });
      let [proposal] = await transaction
        .select()
        .from(stateReformProposals)
        .where(
          and(
            eq(stateReformProposals.draftId, input.draftId),
            eq(stateReformProposals.version, input.version),
          ),
        );
      if (proposal === undefined && input.version === draft.version) {
        [proposal] = await transaction
          .select()
          .from(stateReformProposals)
          .where(
            and(
              eq(stateReformProposals.draftId, input.draftId),
              eq(stateReformProposals.configurationHash, configurationHash(draft.configuration)),
              eq(stateReformProposals.baseRevisionId, context.state.currentRevisionId ?? ''),
            ),
          );
      }
      if (
        !proposal ||
        proposal.configurationHash !== configurationHash(draft.configuration) ||
        proposal.baseRevisionId !== context.state.currentRevisionId
      ) {
        throw new DomainError(
          HTTP.conflict,
          'PROPOSAL_SUPERSEDED',
          'Предложение изменено или ещё не отправлено на рассмотрение',
        );
      }
      if (
        !['SINGLE_OFFICE', 'ANY_OF_OFFICES', 'MULTIPLE_OFFICES', 'COMBINED'].includes(
          context.policy.mechanism,
        ) ||
        !context.policy.officeIds.includes(input.officeId)
      ) {
        throw new DomainError(
          HTTP.forbidden,
          'OFFICE_NOT_AUTHORIZED',
          'Должность не имеет права одобрить реформу',
        );
      }
      const [holder] = await transaction
        .select()
        .from(stateOfficeHolders)
        .where(
          and(
            eq(stateOfficeHolders.officeId, input.officeId),
            eq(stateOfficeHolders.userId, actorId),
            isNull(stateOfficeHolders.until),
          ),
        );
      const office = context.current.governance.offices.find((item) => item.id === input.officeId);
      if (!holder || !office || !holderHasAuthority(office, holder.since, new Date())) {
        throw new DomainError(
          HTTP.forbidden,
          'HOLDER_REQUIRED',
          'Требуется действующий держатель должности',
        );
      }
      await transaction
        .insert(stateReformApprovals)
        .values({
          draftId: input.draftId,
          version: proposal.version,
          officeId: input.officeId,
          actorId,
        })
        .onConflictDoNothing();
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Publication checks approvals and the base revision under the same state lock.
  public async publish(draftId: string, actorId: string, version: number): Promise<string> {
    const draft = await this.db.transaction(
      async (transaction) => await lockedDraft(transaction, draftId, actorId),
    );
    if (draft.baseRevisionId === null || draft.stateId === null) {
      throw new DomainError(HTTP.badRequest, 'CREATION_DRAFT', 'Это черновик создания государства');
    }
    const [proposal] = await this.db
      .select()
      .from(stateReformProposals)
      .where(
        and(
          eq(stateReformProposals.draftId, draftId),
          eq(stateReformProposals.configurationHash, configurationHash(draft.configuration)),
          eq(stateReformProposals.baseRevisionId, draft.baseRevisionId ?? ''),
        ),
      );
    if (!proposal) {
      throw new DomainError(
        HTTP.conflict,
        'PROPOSAL_REQUIRED',
        'Отправьте текущую конфигурацию на рассмотрение',
      );
    }
    const [vote] = await this.db
      .select()
      .from(stateReformVotes)
      .where(
        and(eq(stateReformVotes.draftId, draftId), eq(stateReformVotes.version, proposal.version)),
      );
    const result = vote
      ? await new VotingService(this.db).detail(vote.votingId, actorId, false)
      : null;
    // oxlint-disable-next-line max-lines-per-function -- Vote/publication approval must stay within the locked transaction.
    return await this.db.transaction(async (transaction) => {
      const context = await contextForDraft(transaction, {
        draftId,
        ownerId: actorId,
        version,
      });
      await requireCitizen(transaction, context.state.id, actorId);
      if (configurationHash(context.draft.configuration) !== proposal.configurationHash) {
        throw new DomainError(HTTP.conflict, 'PROPOSAL_SUPERSEDED', 'Предложение изменено');
      }
      const approvals = await transaction
        .select()
        .from(stateReformApprovals)
        .innerJoin(
          stateOfficeHolders,
          and(
            eq(stateOfficeHolders.officeId, stateReformApprovals.officeId),
            eq(stateOfficeHolders.userId, stateReformApprovals.actorId),
            isNull(stateOfficeHolders.until),
          ),
        )
        .where(
          and(
            eq(stateReformApprovals.draftId, draftId),
            eq(stateReformApprovals.version, proposal.version),
          ),
        );
      const approvedIds = new Set(
        approvals
          .filter((row) => {
            const office = context.current.governance.offices.find(
              (item) => item.id === row.state_reform_approvals.officeId,
            );
            return (
              office !== undefined &&
              holderHasAuthority(office, row.state_office_holders.since, new Date())
            );
          })
          .map((row) => row.state_reform_approvals.officeId),
      );
      const { policy } = context;
      const officeApproved =
        policy.mechanism === 'ANY_OF_OFFICES'
          ? policy.officeIds.some((id) => approvedIds.has(id))
          : policy.officeIds.every((id) => approvedIds.has(id));
      const voteApproved =
        result?.status === 'CLOSED' &&
        result.result?.options.some(
          (option) => option.id === vote?.approvalOptionId && option.approved,
        ) === true;
      const needsVote = ['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(policy.mechanism);
      const needsOffice = [
        'SINGLE_OFFICE',
        'ANY_OF_OFFICES',
        'MULTIPLE_OFFICES',
        'COMBINED',
      ].includes(policy.mechanism);
      if (
        policy.mechanism === 'MANUAL' ||
        (needsVote && !voteApproved) ||
        (needsOffice && !officeApproved)
      ) {
        throw new DomainError(
          HTTP.forbidden,
          'REFORM_NOT_APPROVED',
          'Реформа ещё не одобрена по действующей процедуре',
        );
      }
      return await publishReformRevision(transaction, context.draft, {
        actorId,
        admin: false,
        reason: 'Approved according to current governance',
      });
    });
  }

  public async adminOverride(
    input: Readonly<{
      stateId: string;
      configuration: StateConfiguration;
      reason: string;
      baseRevisionId: string;
    }>,
    actorId: string,
  ): Promise<string> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      if (!input.reason.trim()) {
        throw new DomainError(HTTP.badRequest, 'REASON_REQUIRED', 'Укажите причину');
      }
      const id = crypto.randomUUID();
      const [draft] = await transaction
        .insert(stateDrafts)
        .values({
          id,
          ownerId: actorId,
          stateId: input.stateId,
          baseRevisionId: input.baseRevisionId,
          title: 'Admin override',
          configuration: input.configuration,
        })
        .returning();
      if (!draft) {
        throw new Error('Draft insert failed');
      }
      return await publishReformRevision(transaction, draft, {
        actorId,
        admin: true,
        reason: input.reason,
      });
    });
  }
}
export { StateReformService };
