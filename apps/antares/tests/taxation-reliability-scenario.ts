// oxlint-disable import/max-dependencies -- Exact reliability checks compose real state institutions, quotes, treaties and ledger evidence.
// oxlint-disable max-lines-per-function, max-statements, no-magic-numbers, unicorn/no-await-expression-member -- Persistent three-state scenario verifies complete atomic rollback and treaty scope.
import { eq, sql } from 'drizzle-orm';
import { expect } from 'vitest';
import type { Database } from '../src/db';
import {
  stateMemberships,
  transferQuotes,
  ledgerTransactions,
  financialAccounts,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { DiplomacyService } from '../src/modules/diplomacy/service';
import { TaxOfficeModerationService } from '../src/modules/taxation/moderation';
import { TaxationService } from '../src/modules/taxation/service';
import { monetaryHash } from '../src/modules/monetary/domain';
import { transferCommandHash } from '../src/modules/taxation/quotes';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishTaxOffice } from './taxation-fixture';

type Fixture = Awaited<ReturnType<typeof monetaryFixture>>;
function transferLaw(bps: number, category = 'TRANSFER'): DirectivePayload {
  return {
    kind: 'ENACT_TAX_LAW',
    lawId: crypto.randomUUID(),
    name: { en: `${category} law ${bps}` },
    description: {},
    document: {},
    effectiveAt: new Date(0).toISOString(),
    rule: {
      event: 'PLAYER_TRANSFER',
      category,
      taxpayer: 'SENDER',
      jurisdictions: ['CITIZENSHIP'],
      rateBps: bps,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    },
  };
}
async function assertTaxReliability(
  db: Database['db'],
  input: Readonly<{ first: Fixture; second: Fixture; currencyId: string }>,
): Promise<void> {
  const { first, second, currencyId } = input;
  const third = await monetaryFixture(db, 'C');
  await addEconomicAuthority(db, third);
  await establishTaxOffice(db, third);
  await db.insert(stateMemberships).values({ stateId: third.stateId, userId: first.founderId });
  const directives = new MonetaryDirectiveService(db);
  const actor = { id: first.founderId, admin: false };
  await directives.create(first.stateId, actor, {
    idempotencyKey: crypto.randomUUID(),
    payload: transferLaw(500),
  });
  await directives.create(first.stateId, actor, {
    idempotencyKey: crypto.randomUUID(),
    payload: transferLaw(100, 'OTHER'),
  });
  await directives.create(
    third.stateId,
    { id: third.founderId, admin: false },
    { idempotencyKey: crypto.randomUUID(), payload: transferLaw(200) },
  );
  const money = new MonetaryService(db);
  const tax = new TaxationService(db);
  const request = {
    idempotencyKey: crypto.randomUUID(),
    currencyId,
    recipientId: first.citizenId,
    amountMinor: '10000',
    purpose: 'Reliability',
  };
  const quote = await money.quote(actor.id, request);
  expect(quote.calculation.totalTaxMinor).toBe('900');
  expect(
    quote.calculation.charges.find((charge) =>
      charge.claims.some((claim) => claim.stateId === third.stateId),
    )?.amountMinor,
  ).toBe('200');
  await expect(money.transfer(second.founderId, { ...request, quoteId: quote.id })).rejects.toThrow(
    'расчёт',
  );
  await expect(
    money.transfer(actor.id, { ...request, amountMinor: '10001', quoteId: quote.id }),
  ).rejects.toThrow('расчёт');
  const expiredId = crypto.randomUUID();
  await db.insert(transferQuotes).values({
    id: expiredId,
    actorId: actor.id,
    commandHash: transferCommandHash(request),
    calculation: quote.calculation,
    calculationHash: monetaryHash(quote.calculation),
    expiresAt: new Date(0),
  });
  await expect(money.transfer(actor.id, { ...request, quoteId: expiredId })).rejects.toThrow(
    'истёк',
  );
  const before = await db.select().from(ledgerTransactions);
  const walletBefore = await money.wallet(actor.id);
  await db.execute(
    sql`create function reject_test_tax_journal() returns trigger language plpgsql as $$ begin if NEW.assessment_id is not null then raise exception 'Injected late tax journal failure'; end if; return NEW; end; $$`,
  );
  await db.execute(
    sql`create trigger reject_test_tax_journal before insert on economic_journals for each row execute function reject_test_tax_journal()`,
  );
  try {
    await expect(money.transfer(actor.id, { ...request, quoteId: quote.id })).rejects.toThrow();
  } finally {
    await db.execute(sql`drop trigger reject_test_tax_journal on economic_journals`);
    await db.execute(sql`drop function reject_test_tax_journal()`);
  }
  expect(await db.select().from(ledgerTransactions)).toEqual(before);
  expect((await money.wallet(actor.id)).accounts).toEqual(walletBefore.accounts);
  const operationId = await money.transfer(actor.id, { ...request, quoteId: quote.id });
  expect((await tax.operation(operationId, actor.id)).journals).toHaveLength(5);
  await expect(
    money.transfer(actor.id, { ...request, amountMinor: '1', quoteId: quote.id }),
  ).rejects.toThrow('ключ');
  const tiny = { ...request, idempotencyKey: crypto.randomUUID(), amountMinor: '1' };
  const tinyQuote = await money.quote(actor.id, tiny);
  expect(tinyQuote.calculation.totalTaxMinor).toBe('0');
  const tinyId = await money.transfer(actor.id, { ...tiny, quoteId: tinyQuote.id });
  const tinyOperation = await tax.operation(tinyId, actor.id);
  expect(tinyOperation.journals).toHaveLength(1);
  expect(tinyOperation.calculation.charges).toHaveLength(3);
  expect(
    (await tax.state(first.stateId, actor)).assessments
      .filter((assessment) => assessment.operationId === tinyId)
      .every((assessment) => assessment.amountMinor === '0'),
  ).toBe(true);
  const service = new DiplomacyService(db);
  const conflictId = await service.create(first.stateId, actor, {
    partnerStateId: third.stateId,
    content: {
      name: { en: 'Conflicting transfer treaty' },
      description: {},
      document: {},
      type: 'TAX_TREATY',
      event: 'PLAYER_TRANSFER',
      category: 'TRANSFER',
      taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
      terms: { mode: 'EXCLUSIVE', taxingStateId: first.stateId },
      effectiveAt: new Date(0).toISOString(),
      expiresAt: null,
      termination: 'BILATERAL',
    },
  });
  const treaty = (await service.state(first.stateId, actor)).items.find(
    (item) => item.id === conflictId,
  );
  const [revision] = treaty?.revisions ?? [];
  if (!revision) {
    throw new Error('Revision missing');
  }
  await service.submit(first.stateId, conflictId, actor, revision.id);
  const payload: DirectivePayload = {
    kind: 'RATIFY_TREATY',
    treatyId: conflictId,
    revisionId: revision.id,
    contentHash: revision.contentHash,
  };
  await directives.create(first.stateId, actor, { idempotencyKey: crypto.randomUUID(), payload });
  await expect(
    directives.create(
      third.stateId,
      { id: third.founderId, admin: false },
      { idempotencyKey: crypto.randomUUID(), payload },
    ),
  ).rejects.toThrow('договор');
  const wallet = await money.wallet(actor.id);
  const balance = wallet.accounts.find(
    (account) => account.currencyId === currencyId,
  )?.balanceMinor;
  if (balance === undefined) {
    throw new Error('Wallet missing');
  }
  const competing = { ...request, amountMinor: (BigInt(balance) / 2n).toString() };
  const one = { ...competing, idempotencyKey: crypto.randomUUID() };
  const two = { ...competing, idempotencyKey: crypto.randomUUID() };
  const quoteOne = await money.quote(actor.id, one);
  const quoteTwo = await money.quote(actor.id, two);
  const results = await Promise.allSettled([
    money.transfer(actor.id, { ...one, quoteId: quoteOne.id }),
    money.transfer(actor.id, { ...two, quoteId: quoteTwo.id }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(
    (
      await db.select().from(financialAccounts).where(eq(financialAccounts.ownerId, actor.id))
    ).every((account) => BigInt(account.balanceMinor) >= 0n),
  ).toBe(true);
  const moderation = new TaxOfficeModerationService(db);
  const offices = await moderation.list(third.adminId);
  const office = offices.find((item) => item.stateId === third.stateId);
  if (office === undefined) {
    throw new Error('Office missing');
  }
  await expect(
    moderation.review(office.id, third.adminId, {
      directiveId: office.establishmentDirectiveId,
      status: 'SUSPENDED',
      reason: '',
    }),
  ).rejects.toThrow('обоснование');
  await moderation.review(office.id, third.adminId, {
    directiveId: office.establishmentDirectiveId,
    status: 'SUSPENDED',
    reason: 'Institution suspended for verification',
  });
  const suspended = await money.quote(actor.id, {
    ...request,
    idempotencyKey: crypto.randomUUID(),
  });
  expect(
    suspended.calculation.charges.some((charge) =>
      charge.claims.some((claim) => claim.stateId === third.stateId),
    ),
  ).toBe(true);
  expect((await tax.publicState(third.stateId, 'en')).office.status).toBe('SUSPENDED');
  await moderation.review(office.id, third.adminId, {
    directiveId: office.establishmentDirectiveId,
    status: 'ACTIVE',
    reason: 'Institution restored',
  });
  expect(
    (
      await money.quote(actor.id, { ...request, idempotencyKey: crypto.randomUUID() })
    ).calculation.charges.some((charge) =>
      charge.claims.some((claim) => claim.stateId === third.stateId),
    ),
  ).toBe(true);
}
export { assertTaxReliability };
