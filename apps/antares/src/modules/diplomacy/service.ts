import { readTreatyHistory } from './history';
// oxlint-disable import/max-dependencies -- Diplomatic orchestration composes state authority, immutable revision storage and protected/public read models.
import { desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { treaties, treatyParties, states, monetaryDirectives } from '../../db/schema';
import type { z } from '@hono/zod-openapi';
import { directiveContext } from '../monetary/directive-context';

import { stateTreaties, publicTreatyDto } from './reader';
import type { TreatySchema, PublicTreatySchema, TreatyHistorySchema } from './read-contracts';
import type { Locale } from '../localized-content/contracts';
import type { Transaction } from '../permissions/transaction';
import type { MonetaryActor, DirectiveDetail } from '../monetary/contracts';
import { monetaryActor, monetaryAudit } from '../monetary/store';
import { policyActor } from '../monetary/evidence';
import { assignmentState } from '../states/office-assignment-context';
import { monetaryError } from '../monetary/domain';
import { TreatyDraftSchema, TreatyEditSchema } from './contracts';
import type { TreatyContent } from './contracts';
import { treatyRecord, treatyRevision, parties, insertTreatyRevision } from './store';

const HISTORY_LIMIT = 50;

// oxlint-disable-next-line max-params -- The explicit authority boundary takes connection, state, actor and amendment intent.
async function diplomacyAuthority(
  transaction: Transaction,
  stateId: string,
  actor: MonetaryActor,
  amendment: boolean,
): Promise<void> {
  await monetaryActor(transaction, actor);
  const state = await assignmentState(transaction, stateId, actor);
  const policy = state.configuration.governance.policies.find(
    (item) => item.action === (amendment ? 'AMEND_TREATY' : 'SIGN_TREATY'),
  );
  if (state.status !== 'ACTIVE' || !policy || !policyActor(state, policy, actor.id)) {
    monetaryError(
      'DIPLOMACY_AUTHORITY_REQUIRED',
      'Требуется действующее дипломатическое полномочие Governance',
    );
  }
}
function assertContentParties(content: TreatyContent, participants: readonly string[]): void {
  if (content.terms.mode === 'EXCLUSIVE' && !participants.includes(content.terms.taxingStateId)) {
    monetaryError(
      'TREATY_PARTY_REQUIRED',
      'Исключительное право может получить только участник договора',
    );
  }
}
class DiplomacyService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async state(
    stateId: string,
    actor: MonetaryActor,
    page = 1,
  ): Promise<{
    items: z.infer<typeof TreatySchema>[];
    directives: DirectiveDetail[];
    page: number;
    hasMore: boolean;
  }> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      const items = await stateTreaties(transaction, stateId, page);
      const rows = await transaction
        .select()
        .from(monetaryDirectives)
        .where(
          sql`${monetaryDirectives.stateId} = ${stateId} and ${monetaryDirectives.payload}->>'kind' in ('RATIFY_TREATY','AMEND_TREATY','DENOUNCE_TREATY','REJECT_TREATY')`,
        )
        .orderBy(desc(monetaryDirectives.createdAt))
        .limit(HISTORY_LIMIT + 1)
        .offset((page - 1) * HISTORY_LIMIT);
      const directives: DirectiveDetail[] = [];
      for (const row of rows.slice(0, HISTORY_LIMIT)) {
        // oxlint-disable-next-line no-await-in-loop -- The bounded workspace includes each independent state decision's current proofs.
        const context = await directiveContext(transaction, row.id, actor);
        directives.push(context.detail);
      }
      return {
        items: items.slice(0, HISTORY_LIMIT),
        directives,
        page,
        hasMore: items.length > HISTORY_LIMIT || rows.length > HISTORY_LIMIT,
      };
    });
  }
  public async history(
    stateId: string,
    actor: MonetaryActor,
    input: Readonly<{ treatyId: string; page: number }>,
  ): Promise<z.infer<typeof TreatyHistorySchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      return await readTreatyHistory(transaction, stateId, input);
    });
  }
  public async publicTreaty(
    id: string,
    locale: Locale,
    page = 1,
  ): Promise<z.infer<typeof PublicTreatySchema>> {
    return await this.db.transaction(
      async (transaction) => await publicTreatyDto(transaction, id, { locale, page }),
      { isolationLevel: 'repeatable read' },
    );
  }
  public async publicList(
    locale: Locale,
    page = 1,
  ): Promise<{ items: z.infer<typeof PublicTreatySchema>[]; page: number; hasMore: boolean }> {
    return await this.db.transaction(
      async (transaction) => {
        const rows = await transaction
          .select()
          .from(treaties)
          .where(
            sql`${treaties.activeRevisionId} is not null and not exists (select 1 from treaty_parties p join states s on s.id = p.state_id where p.treaty_id = ${treaties.id} and s.status <> 'ACTIVE')`,
          )
          .orderBy(desc(treaties.createdAt))
          .limit(HISTORY_LIMIT + 1)
          .offset((page - 1) * HISTORY_LIMIT);
        const result: z.infer<typeof PublicTreatySchema>[] = [];
        for (const row of rows.slice(0, HISTORY_LIMIT)) {
          // oxlint-disable-next-line no-await-in-loop -- Only published revisions hydrate in this cookie-free public read.
          result.push(await publicTreatyDto(transaction, row.id, { locale }));
        }
        return { items: result, page, hasMore: rows.length > HISTORY_LIMIT };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
  public async create(stateId: string, actor: MonetaryActor, raw: unknown): Promise<string> {
    const input = TreatyDraftSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await diplomacyAuthority(transaction, stateId, actor, false);
      const [partner] = await transaction
        .select()
        .from(states)
        .where(eq(states.id, input.partnerStateId));
      if (partner?.status !== 'ACTIVE' || partner.id === stateId) {
        monetaryError('TREATY_PARTNER_INVALID', 'Выберите другое действующее государство');
      }
      assertContentParties(input.content, [stateId, partner.id]);
      const id = crypto.randomUUID();
      const revisionId = crypto.randomUUID();
      await transaction
        .insert(treaties)
        .values({ id, proposerStateId: stateId, currentRevisionId: revisionId });
      await transaction.insert(treatyParties).values([
        { treatyId: id, stateId, position: 0 },
        { treatyId: id, stateId: partner.id, position: 1 },
      ]);
      await insertTreatyRevision(transaction, {
        id: revisionId,
        treatyId: id,
        number: 1,
        actorId: actor.id,
        content: input.content,
      });
      await monetaryAudit(transaction, {
        actorId: actor.id,
        id,
        action: 'diplomacy.draft.created',
      });
      return id;
    });
  }
  // oxlint-disable-next-line max-params -- Resource state, treaty identity, actor and validated input stay explicit.
  public async edit(
    stateId: string,
    id: string,
    actor: MonetaryActor,
    raw: unknown,
  ): Promise<void> {
    const input = TreatyEditSchema.parse(raw);
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const treaty = await treatyRecord(transaction, id);
      await diplomacyAuthority(transaction, stateId, actor, treaty.activeRevisionId !== null);
      const participants = await parties(transaction, id);
      if (
        !participants.includes(stateId) ||
        treaty.currentRevisionId !== input.baseRevisionId ||
        treaty.status === 'TERMINATED'
      ) {
        monetaryError('TREATY_STALE', 'Договор изменился или завершён');
      }
      assertContentParties(input.content, participants);
      const previous = await treatyRevision(transaction, input.baseRevisionId);
      const revisionId = crypto.randomUUID();
      await insertTreatyRevision(transaction, {
        id: revisionId,
        treatyId: id,
        number: previous.number + 1,
        actorId: actor.id,
        content: input.content,
      });
      await transaction
        .update(treaties)
        .set({ currentRevisionId: revisionId, proposerStateId: stateId, status: 'DRAFT' })
        .where(eq(treaties.id, id));
      await monetaryAudit(transaction, {
        actorId: actor.id,
        id,
        action: 'diplomacy.revision.created',
      });
    });
  }
  // oxlint-disable-next-line max-params -- State, treaty, actor and immutable revision are all checked independently.
  public async submit(
    stateId: string,
    id: string,
    actor: MonetaryActor,
    revisionId: string,
  ): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const treaty = await treatyRecord(transaction, id);
      await diplomacyAuthority(transaction, stateId, actor, treaty.activeRevisionId !== null);
      if (
        treaty.proposerStateId !== stateId ||
        treaty.status !== 'DRAFT' ||
        treaty.currentRevisionId !== revisionId
      ) {
        monetaryError('TREATY_STALE', 'Отправить можно только текущий проект своего государства');
      }
      await transaction.update(treaties).set({ status: 'PROPOSED' }).where(eq(treaties.id, id));
      await monetaryAudit(transaction, { actorId: actor.id, id, action: 'diplomacy.proposed' });
    });
  }
}
export { DiplomacyService, diplomacyAuthority };
