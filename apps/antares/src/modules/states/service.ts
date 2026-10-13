// oxlint-disable import/max-dependencies -- State orchestration composes persistence, revisions, validation and audit.
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  states,
  stateFounders,
  stateMemberships,
  stateDrafts,
  stateGovernanceRevisions,
  stateRevisionTexts,
} from '../../db/schema';
import { DomainError, HTTP, isUniqueConflict } from '../errors';
import { authorizeMutation } from '../permissions/transaction';

import { readText } from '../localized-content/service';
import type { LocalizedInput, Locale } from '../localized-content/contracts';
import { lockedDraft, assertEditable } from './drafts';
import { publishRevision } from './revisions';
import { readStateDetail } from './reader';
import type { StateReadAccess } from './reader';
import { audit, stateRecord, validatePersistent } from './persistence';
import { assertTransition } from './domain';
import type { StateDetail, StateStatus, Issue } from './contracts';

class StateService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async validateDraft(id: string, ownerId: string): Promise<Issue[]> {
    return await this.db.transaction(async (transaction) => {
      const draft = await lockedDraft(transaction, id, ownerId);
      let primaryFounderId = ownerId;
      if (draft.stateId !== null) {
        const [primary] = await transaction
          .select()
          .from(stateFounders)
          .where(and(eq(stateFounders.stateId, draft.stateId), eq(stateFounders.type, 'PRIMARY')));
        if (primary) {
          primaryFounderId = primary.userId;
        }
      }
      return await validatePersistent(transaction, draft.configuration, {
        primaryFounderId,
        mediaOwnerId: ownerId,
        stateId: draft.stateId,
      });
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Creation, founders, citizenship, revision and audit must be reviewed as one atomic transaction.
  public async submit(id: string, ownerId: string, version: number): Promise<string> {
    try {
      // oxlint-disable-next-line max-lines-per-function -- All materialization writes commit or roll back together.
      return await this.db.transaction(async (transaction) => {
        const draft = await lockedDraft(transaction, id, ownerId);
        assertEditable(draft, version);
        if (draft.stateId !== null) {
          throw new DomainError(HTTP.badRequest, 'REFORM_DRAFT', 'Используйте публикацию реформы');
        }
        const issues = await validatePersistent(transaction, draft.configuration, {
          primaryFounderId: ownerId,
          mediaOwnerId: ownerId,
          stateId: null,
        });
        if (issues.some((issue) => issue.severity === 'ERROR')) {
          throw new DomainError(
            HTTP.badRequest,
            'INVALID_STATE',
            issues
              .filter((issue) => issue.severity === 'ERROR')
              .map((issue) => issue.message)
              .join('; '),
          );
        }
        const stateId = crypto.randomUUID();
        await transaction.insert(states).values({ id: stateId, slug: draft.configuration.slug });
        await transaction.insert(stateFounders).values([
          { stateId, userId: ownerId, type: 'PRIMARY' },
          ...draft.configuration.cofounderIds.map((userId) => ({
            stateId,
            userId,
            type: 'COFOUNDER' as const,
          })),
        ]);
        await transaction
          .insert(stateMemberships)
          .values(
            [ownerId, ...draft.configuration.cofounderIds].map((userId) => ({ stateId, userId })),
          );
        const revisionId = await publishRevision(transaction, {
          stateId,
          number: 1,
          actorId: ownerId,
          previousRevisionId: null,
          adminOverride: false,
          reason: null,
          configuration: draft.configuration,
        });
        await transaction
          .update(states)
          .set({ currentRevisionId: revisionId })
          .where(eq(states.id, stateId));
        await transaction
          .update(stateDrafts)
          .set({ submittedStateId: stateId, version: draft.version + 1, updatedAt: new Date() })
          .where(eq(stateDrafts.id, id));
        await audit(transaction, {
          actorId: ownerId,
          targetId: stateId,
          action: 'state.created',
          reason: 'Creation draft submitted',
        });
        return stateId;
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new DomainError(
          HTTP.conflict,
          'STATE_CONFLICT',
          'Адрес государства или идентификатор должности уже занят',
        );
      }
      throw error;
    }
  }
  public async changeStatus(
    id: string,
    actorId: string,
    decision: Readonly<{ status: StateStatus; reason: string }>,
  ): Promise<void> {
    const { status, reason } = decision;
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const record = await stateRecord(transaction, id);
      assertTransition(record.status, status, reason);
      await transaction
        .update(states)
        .set({ status, statusReason: reason })
        .where(eq(states.id, id));
      await audit(transaction, {
        actorId,
        targetId: id,
        action: `state.status.${status.toLowerCase()}`,
        reason,
      });
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- The authorized list joins current revision names using the shared localized-content store.
  public async list(
    status?: StateStatus,
    adminActorId?: string,
    memberId?: string,
  ): Promise<{ id: string; slug: string; status: StateStatus; name: LocalizedInput }[]> {
    return await this.db.transaction(async (transaction) => {
      if (adminActorId !== undefined) {
        await authorizeMutation(transaction, adminActorId, 'states.manage');
      }
      let filter = status === undefined ? undefined : eq(states.status, status);
      if (adminActorId === undefined && memberId === undefined) {
        filter = eq(states.status, 'ACTIVE');
      }
      if (memberId !== undefined) {
        const memberships = transaction
          .select({ stateId: stateMemberships.stateId })
          .from(stateMemberships)
          .where(and(eq(stateMemberships.userId, memberId), isNull(stateMemberships.endedAt)));
        filter = inArray(states.id, memberships);
      }
      const records = await transaction
        .select({
          id: states.id,
          slug: states.slug,
          status: states.status,
          revisionId: states.currentRevisionId,
        })
        .from(states)
        .where(filter)
        .orderBy(desc(states.createdAt));
      return await Promise.all(
        records.map(async (record) => {
          const [reference] =
            record.revisionId === null
              ? []
              : await transaction
                  .select()
                  .from(stateRevisionTexts)
                  .where(
                    and(
                      eq(stateRevisionTexts.revisionId, record.revisionId),
                      eq(stateRevisionTexts.path, 'name'),
                    ),
                  );
          return {
            id: record.id,
            slug: record.slug,
            status: record.status,
            name: reference === undefined ? {} : await readText(transaction, reference.textId),
          };
        }),
      );
    });
  }
  public async detail(
    id: string,
    locale: Locale,
    access: StateReadAccess = {},
  ): Promise<StateDetail> {
    return await this.db.transaction(
      async (transaction) => await readStateDetail(transaction, { id, locale, access }),
    );
  }
  public async publicBySlug(slug: string, locale: Locale): Promise<StateDetail> {
    const [record] = await this.db
      .select({ id: states.id })
      .from(states)
      .where(and(eq(states.slug, slug), eq(states.status, 'ACTIVE')));
    if (!record) {
      throw new DomainError(HTTP.notFound, 'STATE_NOT_FOUND', 'Государство не найдено');
    }
    return await this.detail(record.id, locale);
  }
  public async history(
    id: string,
    actorId: string,
    admin: boolean,
  ): Promise<
    {
      id: string;
      number: number;
      previousRevisionId: string | null;
      actorId: string;
      adminOverride: boolean;
      reason: string | null;
      createdAt: string;
    }[]
  > {
    await this.detail(id, 'en', { actorId, admin });
    const rows = await this.db
      .select()
      .from(stateGovernanceRevisions)
      .where(eq(stateGovernanceRevisions.stateId, id))
      .orderBy(desc(stateGovernanceRevisions.number));
    return rows.map((row) => ({
      id: row.id,
      number: row.number,
      previousRevisionId: row.previousRevisionId,
      actorId: row.actorId,
      adminOverride: row.adminOverride,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
export { StateService };
