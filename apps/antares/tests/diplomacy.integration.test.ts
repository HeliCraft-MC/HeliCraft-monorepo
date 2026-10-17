import { assertTreatyHistory } from './diplomacy-history-scenario';
// oxlint-disable import/max-dependencies -- Real PostgreSQL diplomatic decisions exercise current state authority and generic frozen voting.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  stateOfficeHolders,
  stateMemberships,
  votings,
  votingEligibleVoters,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryReviewService } from '../src/modules/monetary/review';
import { DiplomacyService } from '../src/modules/diplomacy/service';
import { StateService } from '../src/modules/states/service';
import { StateReformService } from '../src/modules/states/reforms';
import { VotingService } from '../src/modules/voting/service';
import type { TreatyContent, TreatyDirective } from '../src/modules/diplomacy/contracts';
import type { MonetaryActor } from '../src/modules/monetary/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';

type Fixture = Awaited<ReturnType<typeof monetaryFixture>>;
interface Environment {
  readonly database: Database;
  readonly container: StartedPostgreSqlContainer;
  readonly first: Fixture;
  readonly second: Fixture;
}
let environment: Environment | null = null;
function requiredEnvironment(): Environment {
  if (environment === null) {
    throw new Error('Fixture unavailable');
  }
  return environment;
}
function content(category: string): TreatyContent {
  return {
    name: { en: `${category} agreement` },
    description: {},
    document: { en: 'Immutable agreement text' },
    type: 'TAX_TREATY',
    event: 'PLAYER_TRANSFER',
    category,
    taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
    terms: { mode: 'EXCLUSIVE', taxingStateId: requiredEnvironment().first.stateId },
    effectiveAt: new Date(0).toISOString(),
    expiresAt: null,
    termination: 'BILATERAL',
  };
}
async function proposal(category: string): Promise<TreatyDirective> {
  const { database, first, second } = requiredEnvironment();
  const service = new DiplomacyService(database.db);
  const actor = { id: first.founderId, admin: false };
  const id = await service.create(first.stateId, actor, {
    partnerStateId: second.stateId,
    content: content(category),
  });
  const workspace = await service.state(first.stateId, actor);
  const treaty = workspace.items.find((item) => item.id === id);
  const revision = treaty?.revisions[0];
  if (revision === undefined) {
    throw new Error('Missing revision');
  }
  await service.submit(first.stateId, id, actor, revision.id);
  return {
    kind: 'RATIFY_TREATY',
    treatyId: id,
    revisionId: revision.id,
    contentHash: revision.contentHash,
  };
}
async function decide(payload: TreatyDirective, fixture: Fixture): Promise<string> {
  return await new MonetaryDirectiveService(requiredEnvironment().database.db).create(
    fixture.stateId,
    { id: fixture.founderId, admin: false },
    { idempotencyKey: crypto.randomUUID(), payload },
  );
}
async function policy(mechanism: 'SINGLE_OFFICE' | 'COMBINED' | 'MANUAL'): Promise<void> {
  const { database, first } = requiredEnvironment();
  const state = await new StateService(database.db).detail(first.stateId, 'en');
  const configuration = structuredClone(state.configuration);
  for (const item of configuration.governance.policies) {
    if (item.action === 'SIGN_TREATY') {
      item.mechanism = mechanism;
      item.officeIds = mechanism === 'MANUAL' ? [] : [first.officeId];
      item.manualProcedure =
        mechanism === 'MANUAL' ? { en: 'Review exact agreement and record a reason' } : {};
    }
  }
  await new StateReformService(database.db).adminOverride(
    {
      stateId: first.stateId,
      baseRevisionId: state.governanceRevisionId,
      reason: 'Explicit procedure fixture',
      configuration,
    },
    first.adminId,
  );
}
beforeAll(async () => {
  const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  const database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  const first = await monetaryFixture(database.db, 'D');
  const second = await monetaryFixture(database.db, 'E');
  await addEconomicAuthority(database.db, first);
  await addEconomicAuthority(database.db, second);
  environment = { container, database, first, second };
});
afterAll(async () => {
  if (environment !== null) {
    await environment.database.pool.end();
    await environment.container.stop();
  }
});
// oxlint-disable-next-line max-lines-per-function -- The suite groups independent database-backed ratification scenarios with shared isolated infrastructure.
describe('independent bilateral ratification', () => {
  it('supersedes all signatures when either party proposes a different immutable revision', async () => {
    const { database, first, second } = requiredEnvironment();
    const service = new DiplomacyService(database.db);
    const payload = await proposal('REVISION');
    await decide(payload, first);
    const partner: MonetaryActor = { id: second.founderId, admin: false };
    await service.edit(second.stateId, payload.treatyId, partner, {
      baseRevisionId: payload.revisionId,
      content: { ...content('REVISION'), name: { en: 'Different exact agreement' } },
    });
    const workspace = await service.state(second.stateId, partner);
    const treaty = workspace.items.find((item) => item.id === payload.treatyId);
    const [revision] = treaty?.revisions ?? [];
    if (revision === undefined) {
      throw new Error('Revision missing');
    }
    expect(treaty?.activeRevisionId).toBeNull();
    expect(revision.contentHash).not.toBe(payload.contentHash);
    await expect(decide(payload, second)).rejects.toThrow('редакция');
    await service.submit(second.stateId, payload.treatyId, partner, revision.id);
    const changed: TreatyDirective = {
      ...payload,
      revisionId: revision.id,
      contentHash: revision.contentHash,
    };
    await decide(changed, second);
    await expect(service.publicTreaty(payload.treatyId, 'en')).rejects.toThrow('не найден');
    await decide(changed, first);
    const publicRecord = await service.publicTreaty(payload.treatyId, 'en');
    expect(publicRecord.revisions).toHaveLength(1);
    expect(publicRecord.revisions[0]?.id).toBe(revision.id);
  });
  it('does not revive a first-party signature after a holder is removed and reappointed', async () => {
    const { database, first, second } = requiredEnvironment();
    const payload = await proposal('TERM');
    const firstId = await decide(payload, first);
    await database.db.transaction(async (transaction) => {
      await transaction
        .update(stateOfficeHolders)
        .set({ until: sql`clock_timestamp()` })
        .where(
          and(eq(stateOfficeHolders.officeId, first.officeId), isNull(stateOfficeHolders.until)),
        );
      await transaction.insert(stateOfficeHolders).values({
        officeId: first.officeId,
        userId: first.founderId,
        since: sql`clock_timestamp()`,
      });
    });
    const directives = new MonetaryDirectiveService(database.db);
    expect((await directives.detail(firstId, { id: first.founderId, admin: false })).stale).toBe(
      true,
    );
    await decide(payload, second);
    const service = new DiplomacyService(database.db);
    await expect(service.publicTreaty(payload.treatyId, 'en')).rejects.toThrow('не найден');
    await decide(payload, first);
    expect((await service.publicTreaty(payload.treatyId, 'en')).status).toBe('ACTIVE');
  });
  it('requires renewed approval after a Governance revision changes and terminates only bilaterally', async () => {
    const { database, first, second } = requiredEnvironment();
    const payload = await proposal('GOVERNANCE');
    await decide(payload, first);
    await policy('SINGLE_OFFICE');
    await decide(payload, second);
    const service = new DiplomacyService(database.db);
    await expect(service.publicTreaty(payload.treatyId, 'en')).rejects.toThrow('не найден');
    await decide(payload, first);
    const terminate: TreatyDirective = { ...payload, kind: 'DENOUNCE_TREATY' };
    await decide(terminate, first);
    expect((await service.publicTreaty(payload.treatyId, 'en')).status).toBe('ACTIVE');
    await decide(terminate, second);
    expect((await service.publicTreaty(payload.treatyId, 'en')).status).toBe('TERMINATED');
    expect((await service.publicTreaty(payload.treatyId, 'en')).revisions).toHaveLength(1);
  });
  it('joins office approvals and a frozen citizen vote and exposes the exact agreement to departed voters', async () => {
    const { database, first, second } = requiredEnvironment();
    await policy('COMBINED');
    const payload = await proposal('COMBINED');
    const directiveId = await decide(payload, first);
    const directives = new MonetaryDirectiveService(database.db);
    const actor = { id: first.founderId, admin: false };
    const detail = await directives.detail(directiveId, actor);
    const [vote] = detail.votes;
    if (!vote) {
      throw new Error('Vote missing');
    }
    expect(
      await database.db
        .select()
        .from(votingEligibleVoters)
        .where(eq(votingEligibleVoters.votingId, vote.id)),
    ).toHaveLength(2);
    await directives.approve(directiveId, actor, first.officeId);
    await expect(directives.apply(directiveId, actor)).rejects.toThrow('Требуются');
    await database.db
      .update(stateMemberships)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(stateMemberships.stateId, first.stateId),
          eq(stateMemberships.userId, first.citizenId),
        ),
      );
    const view = await new MonetaryReviewService(database.db).votingPayload(vote.id, {
      id: first.citizenId,
      admin: false,
    });
    expect(view.treatyContent?.document.en).toBe('Immutable agreement text');
    const voting = new VotingService(database.db);
    const ballot = await voting.detail(vote.id, first.founderId, false);
    const [yes] = ballot.input.options;
    if (!yes) {
      throw new Error('Option missing');
    }
    await voting.cast(vote.id, first.founderId, { choices: [yes.id], abstain: false });
    await voting.cast(vote.id, first.citizenId, { choices: [yes.id], abstain: false });
    await database.db
      .update(votings)
      .set({
        opensAt: sql`clock_timestamp() - interval '2 seconds'`,
        closesAt: sql`clock_timestamp() - interval '1 second'`,
      })
      .where(eq(votings.id, vote.id));
    await directives.apply(directiveId, actor);
    await decide(payload, second);
    expect(
      (await new DiplomacyService(database.db).publicTreaty(payload.treatyId, 'en')).status,
    ).toBe('ACTIVE');
  });
  it('requires a reasoned administrator for a configured manual procedure and preserves state-specific authority', async () => {
    const { database, first, second } = requiredEnvironment();
    await policy('MANUAL');
    const payload = await proposal('MANUAL');
    const id = await decide(payload, first);
    const directives = new MonetaryDirectiveService(database.db);
    await expect(
      directives.apply(
        id,
        { id: first.founderId, admin: false },
        'A citizen cannot impersonate administration',
      ),
    ).rejects.toThrow('Требуются');
    await expect(directives.apply(id, { id: first.adminId, admin: true })).rejects.toThrow(
      'обоснованием',
    );
    await directives.apply(
      id,
      { id: first.adminId, admin: true },
      'Exact immutable agreement reviewed',
    );
    await decide(payload, second);
    expect(
      (await new DiplomacyService(database.db).publicTreaty(payload.treatyId, 'en')).status,
    ).toBe('ACTIVE');
    await policy('SINGLE_OFFICE');
  });
  it('retains private revisions beyond the first history page and rejects an expired offer', async () => {
    const fixture = requiredEnvironment();
    await assertTreatyHistory(fixture.database, {
      first: fixture.first,
      second: fixture.second,
      content: content('HISTORY'),
    });
  });
});
