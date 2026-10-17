// oxlint-disable no-magic-numbers -- The real 52-version fixture crosses the bounded history page.
import { expect } from 'vitest';
import type { Database } from '../src/db';
import { DiplomacyService } from '../src/modules/diplomacy/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import type { TreatyContent } from '../src/modules/diplomacy/contracts';

type Fixture = Readonly<{ stateId: string; founderId: string }>;
// oxlint-disable-next-line max-lines-per-function, max-statements -- The boundary fixture checks real immutable saves, private history and expired ratification together.
async function assertTreatyHistory(
  database: Database,
  input: Readonly<{ first: Fixture; second: Fixture; content: TreatyContent }>,
): Promise<void> {
  const { first, second, content: original } = input;
  const service = new DiplomacyService(database.db);
  const actor = { id: first.founderId, admin: false };
  const id = await service.create(first.stateId, actor, {
    partnerStateId: second.stateId,
    content: original,
  });
  for (let index = 1; index < 52; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Every draft revision is saved through the actual authorized API service.
    const history = await service.history(first.stateId, actor, { treatyId: id, page: 1 });
    const [revision] = history.items;
    if (revision === undefined) {
      throw new Error('Revision missing');
    }
    // oxlint-disable-next-line no-await-in-loop -- Revisions pin their immutable predecessor before the next update.
    await service.edit(first.stateId, id, actor, {
      baseRevisionId: revision.id,
      content: { ...original, name: { en: `Draft revision ${index}` } },
    });
  }
  const history = await service.history(first.stateId, actor, { treatyId: id, page: 1 });
  const older = await service.history(first.stateId, actor, { treatyId: id, page: 2 });
  expect(history.items).toHaveLength(50);
  expect(history.hasMore).toBe(true);
  expect(older.items.map((revision) => revision.number)).toEqual([2, 1]);
  const partnerHistory = await service.history(
    second.stateId,
    { id: second.founderId, admin: false },
    { treatyId: id, page: 1 },
  );
  expect(partnerHistory.items).toEqual([]);
  const expired = await service.create(first.stateId, actor, {
    partnerStateId: second.stateId,
    content: {
      ...original,
      category: 'EXPIRED',
      effectiveAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-01-02T00:00:00.000Z',
    },
  });
  const expiredHistory = await service.history(first.stateId, actor, {
    treatyId: expired,
    page: 1,
  });
  const [revision] = expiredHistory.items;
  if (revision === undefined) {
    throw new Error('Revision missing');
  }
  await service.submit(first.stateId, expired, actor, revision.id);
  await expect(
    new MonetaryDirectiveService(database.db).create(first.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'RATIFY_TREATY',
        treatyId: expired,
        revisionId: revision.id,
        contentHash: revision.contentHash,
      },
    }),
  ).rejects.toThrow('истёк');
}
export { assertTreatyHistory };
