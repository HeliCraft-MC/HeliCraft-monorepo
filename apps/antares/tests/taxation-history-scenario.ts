// oxlint-disable no-magic-numbers, no-await-in-loop -- A real 52-revision boundary verifies that history remains reachable beyond one bounded page.
import { eq } from 'drizzle-orm';
import { expect } from 'vitest';
import type { Database } from '../src/db';
import { taxLawRevisions } from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { TaxationService } from '../src/modules/taxation/service';
import { latestLawRevision } from '../src/modules/taxation/laws';
import type { TaxRule } from '../src/modules/taxation/contracts';

// oxlint-disable-next-line max-statements, max-lines-per-function -- The bounded-history fixture publishes real immutable laws before checking both pages and SQL protection.
async function assertLawHistory(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string }>,
): Promise<void> {
  const directives = new MonetaryDirectiveService(db);
  const actor = { id: fixture.founderId, admin: false };
  const lawId = crypto.randomUUID();
  const rule: TaxRule = {
    event: 'PLAYER_TRANSFER',
    category: 'CONTRIBUTION',
    taxpayer: 'SENDER',
    jurisdictions: ['CITIZENSHIP'],
    recipient: 'STATE_TREASURY',
    rateBps: 0,
    currencyIds: [],
  };
  const content = {
    name: { en: 'History pagination law' },
    description: {},
    document: {},
    rule,
    effectiveAt: new Date(0).toISOString(),
  };
  await directives.create(fixture.stateId, actor, {
    idempotencyKey: crypto.randomUUID(),
    payload: { kind: 'ENACT_TAX_LAW', lawId, ...content },
  });
  for (let index = 1; index < 52; index += 1) {
    const previous = await db.transaction(
      async (transaction) => await latestLawRevision(transaction, lawId),
    );
    if (previous === null) {
      throw new Error('Law missing');
    }
    await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'AMEND_TAX_LAW',
        lawId,
        baseRevisionId: previous.id,
        ...content,
        effectiveAt: new Date().toISOString(),
      },
    });
  }
  const tax = new TaxationService(db);
  const first = await tax.publicLaw(lawId, 'en', 1);
  const second = await tax.publicLaw(lawId, 'en', 2);
  expect(first.revisions).toHaveLength(50);
  expect(first.hasMore).toBe(true);
  expect(second.revisions.map((revision) => revision.number)).toEqual([2, 1]);
  expect(second.hasMore).toBe(false);
  const [, original] = second.revisions;
  if (original === undefined) {
    throw new Error('Original revision missing');
  }
  await expect(
    db.update(taxLawRevisions).set({ number: 99 }).where(eq(taxLawRevisions.id, original.id)),
  ).rejects.toThrow();
}
export { assertLawHistory };
