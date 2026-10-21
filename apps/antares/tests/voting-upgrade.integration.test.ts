// oxlint-disable import/max-dependencies -- The migration scenario creates actual pre-upgrade Voting rows and verifies their preserved identities and results after additive migrations.
import { rm } from 'node:fs/promises';
import { z } from '@hono/zod-openapi';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { createText } from '../src/modules/localized-content/service';
import { VotingService } from '../src/modules/voting/service';
import type { VotingInput } from '../src/modules/voting/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';
import { monetaryFixture } from './monetary-fixture';
import { migrationsBefore } from './migration-fixture';

const FIRST_VOTING_UPGRADE = 25;
async function history(db: Database['db'], id: string): Promise<unknown> {
  const result = await db.execute(sql`select jsonb_build_object(
    'voting', (select to_jsonb(v) - 'company_revision_id' from votings v where v.id = ${id}),
    'voters', (select jsonb_agg(jsonb_build_object('votingId', voting_id, 'userId', user_id, 'weight', weight::text) order by user_id) from voting_eligible_voters where voting_id = ${id}),
    'ballots', (select jsonb_agg(to_jsonb(b) - array['voter_id','company_decision_id','state_directive_id','database_transaction'] order by b.id) from voting_ballots b where b.voting_id = ${id}),
    'choices', (select jsonb_agg(to_jsonb(c) order by c.ballot_id) from voting_ballot_choices c join voting_ballots b on b.id = c.ballot_id where b.voting_id = ${id})
  ) as snapshot`);
  return z.object({ snapshot: z.unknown() }).parse(result.rows[0]).snapshot;
}
async function legacyVoting(
  db: Database['db'],
  players: Readonly<{ founderId: string; citizenId: string }>,
): Promise<{ id: string; yes: string }> {
  return await db.transaction(async (transaction) => {
    const id = crypto.randomUUID();
    const yes = crypto.randomUUID();
    const no = crypto.randomUUID();
    const optionYes = crypto.randomUUID();
    const optionNo = crypto.randomUUID();
    const firstBallot = crypto.randomUUID();
    const secondBallot = crypto.randomUUID();
    const opens = new Date(Date.now() - 7_200_000);
    const closes = new Date(Date.now() - 3_600_000);
    const input: VotingInput = {
      title: {},
      description: {},
      options: [
        { id: yes, label: {} },
        { id: no, label: {} },
      ],
      opensAt: opens.toISOString(),
      closesAt: closes.toISOString(),
      electorate: { type: 'SPECIFIC_USERS', userIds: [players.founderId, players.citizenId] },
      rules: { ...emptyConfiguration().governance.votingDefaults, thresholdKind: 'UNANIMOUS' },
      resultVisibility: 'ELIGIBLE_ONLY',
      maxSelections: 1,
    };
    const title = await createText(transaction, {
      en: 'Historical decision',
      ru: 'Историческое решение',
    });
    const description = await createText(transaction, {});
    const approve = await createText(transaction, { en: 'Approve', ru: 'Одобрить' });
    const reject = await createText(transaction, { en: 'Reject', ru: 'Отклонить' });
    await transaction.execute(
      sql`insert into votings(id,created_by,status,title_text_id,description_text_id,opens_at,closes_at,configuration,snapshot_at) values (${id},${players.founderId},'CLOSED',${title},${description},${opens.toISOString()},${closes.toISOString()},${JSON.stringify(input)}::jsonb,${opens.toISOString()})`,
    );
    await transaction.execute(
      sql`insert into voting_options(id,voting_id,option_key,label_text_id,position) values (${optionYes},${id},${yes},${approve},0),(${optionNo},${id},${no},${reject},1)`,
    );
    await transaction.execute(
      sql`insert into voting_eligible_voters(voting_id,user_id,weight) values (${id},${players.founderId},1),(${id},${players.citizenId},1)`,
    );
    await transaction.execute(
      sql`insert into voting_ballots(id,voting_id,user_id,abstain,cast_at) values (${firstBallot},${id},${players.founderId},false,${closes.toISOString()}),(${secondBallot},${id},${players.citizenId},false,${closes.toISOString()})`,
    );
    await transaction.execute(
      sql`insert into voting_ballot_choices(ballot_id,option_id) values (${firstBallot},${optionYes}),(${secondBallot},${optionYes})`,
    );
    return { id, yes };
  });
}
describe('Voting subject identity upgrade', () => {
  it('preserves old government-compatible voter identities and ballots without rewriting historical evidence', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    const folder = await migrationsBefore(FIRST_VOTING_UPGRADE);
    try {
      await migrate(database.db, { migrationsFolder: folder });
      const players = await monetaryFixture(database.db, 'Vu');
      const voting = await legacyVoting(database.db, players);
      const before = await history(database.db, voting.id);
      await migrate(database.db, { migrationsFolder: './drizzle' });
      expect(await history(database.db, voting.id)).toEqual(before);
      const detail = await new VotingService(database.db).detail(
        voting.id,
        players.founderId,
        false,
      );
      expect(detail).toMatchObject({
        status: 'CLOSED',
        eligible: true,
        hasVoted: true,
        companyRevisionId: null,
        result: { eligible: 2, participating: 2, weights: { eligible: '2', participating: '2' } },
      });
      expect(detail.result?.options.find((option) => option.id === voting.yes)?.approved).toBe(
        true,
      );
      await expect(
        database.db.execute(
          sql`update voting_eligible_voters set weight = 2 where voting_id = ${voting.id}`,
        ),
      ).rejects.toThrow();
      await expect(
        database.db.execute(sql`delete from voting_ballots where voting_id = ${voting.id}`),
      ).rejects.toThrow();
      expect(await history(database.db, voting.id)).toEqual(before);
    } finally {
      await database.pool.end();
      await container.stop();
      await rm(folder, { recursive: true, force: true });
    }
  });
});
