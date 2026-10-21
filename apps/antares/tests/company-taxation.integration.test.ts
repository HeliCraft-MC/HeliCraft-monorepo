// oxlint-disable import/max-dependencies -- Disposable scenarios exercise actual state/corporate decisions, immutable quotes, legal participants and exact tax journals.
// oxlint-disable max-lines -- Shared real state/company fixtures support independent payment, regime, approval and branch evidence scenarios.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  currencies,
  ledgerTransactions,
  economicOperations,
  taxFractionalBalances,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import { TaxationService } from '../src/modules/taxation/service';
import type { TaxRule } from '../src/modules/taxation/contracts';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { CompanyPaymentQuoteService } from '../src/modules/companies/payment-quote-service';
import type { CorporatePayment } from '../src/modules/companies/payment-quote';
import { CompanyFinanceService } from '../src/modules/companies/finance';
import { PublicCompanyBranchService } from '../src/modules/companies/branch-public';
import { latestLawRevision } from '../src/modules/taxation/laws';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishMoney, establishTaxOffice } from './taxation-fixture';
import { freeCompanyPolicy } from './companies-fixture';
import { registeredTaxCompany } from './company-tax-fixture';
import type { TaxStateFixture } from './company-tax-fixture';

let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
let home: TaxStateFixture | null = null;
let foreign: TaxStateFixture | null = null;
let currencyId = '';
function context(): { db: Database['db']; home: TaxStateFixture; foreign: TaxStateFixture } {
  if (!database || !home || !foreign) {
    throw new Error('Corporate tax fixture missing');
  }
  return { db: database.db, home, foreign };
}
async function directive(payload: DirectivePayload, issuer = context().home): Promise<string> {
  return await new MonetaryDirectiveService(context().db).create(
    issuer.stateId,
    { id: issuer.founderId, admin: false },
    { idempotencyKey: crypto.randomUUID(), payload },
  );
}
async function enact(rule: TaxRule, issuer = context().home): Promise<string> {
  const lawId = crypto.randomUUID();
  await directive(
    {
      kind: 'ENACT_TAX_LAW',
      lawId,
      name: { en: 'Approved corporate tax law' },
      description: {},
      document: {},
      effectiveAt: new Date(0).toISOString(),
      rule,
    },
    issuer,
  );
  return lawId;
}
async function exemptCompanyLaw(
  companyId: string,
  base: TaxRule,
  ids: { baseId: string; replacementId: string },
): Promise<void> {
  const previous = await context().db.transaction(
    async (transaction) => await latestLawRevision(transaction, ids.replacementId),
  );
  if (previous === null) {
    throw new Error('Special rule missing');
  }
  await directive({
    kind: 'AMEND_TAX_LAW',
    lawId: ids.replacementId,
    baseRevisionId: previous.id,
    effectiveAt: new Date().toISOString(),
    name: { en: 'Explicit exemption' },
    description: {},
    document: {},
    rule: {
      ...base,
      rateBps: 0,
      regime: { companyId, branchId: null, mode: 'EXEMPT', targetLawId: ids.baseId },
    },
  });
}
async function fund(companyId: string, amountMinor = '10000'): Promise<void> {
  await directive({
    kind: 'BANK_TRANSFER',
    currencyId,
    amountMinor,
    purpose: 'Official company funding',
    recipient: { type: 'COMPANY', companyId },
  });
}
async function preparedPayment(
  company: Awaited<ReturnType<typeof registeredTaxCompany>>,
  payment: CorporatePayment,
): Promise<{ revisionId: string; idempotencyKey: string; payload: CorporatePayment }> {
  const { db, home: owner } = context();
  const quote = await new CompanyPaymentQuoteService(db).create(
    company.id,
    { id: owner.citizenId, admin: false },
    { revisionId: company.revisionId, payment },
  );
  return {
    revisionId: company.revisionId,
    idempotencyKey: crypto.randomUUID(),
    payload: {
      ...payment,
      quoteId: quote.id,
      approvedDebitMinor: quote.calculation.totalDebitMinor,
    },
  };
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  home = await monetaryFixture(database.db, 'Th');
  foreign = await monetaryFixture(database.db, 'Tf');
  await addEconomicAuthority(database.db, home);
  await addEconomicAuthority(database.db, foreign);
  currencyId = await establishMoney(database.db, home);
  await establishTaxOffice(database.db, home);
  await establishTaxOffice(database.db, foreign);
  await directive({
    kind: 'SET_COMPANY_REGISTRATION_POLICY',
    baseRevisionId: null,
    policy: { ...freeCompanyPolicy, branchMode: 'FREE' },
  });
  await directive(
    {
      kind: 'SET_COMPANY_REGISTRATION_POLICY',
      baseRevisionId: null,
      policy: { ...freeCompanyPolicy, branchMode: 'FREE' },
    },
    foreign,
  );
});
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Each independent real settlement/approval scenario retains its exact before/after financial and legal assertions.
describe('typed company taxation and approved financial quotes', () => {
  it('settles player/company, company/player and company/company events with the legal payer rather than its human representative', async () => {
    const { db, home: owner } = context();
    const first = await registeredTaxCompany(db, owner);
    const second = await registeredTaxCompany(db, owner);
    await fund(first.id);
    await fund(second.id);
    const senderLaw = await enact({
      event: 'COMPANY_PLAYER_TRANSFER',
      events: ['COMPANY_PLAYER_TRANSFER', 'COMPANY_TRANSFER'],
      category: 'TRANSFER',
      taxpayer: 'SENDER',
      jurisdictions: ['COMPANY_REGISTRATION'],
      rateBps: 500,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    });
    await enact({
      event: 'PLAYER_COMPANY_TRANSFER',
      events: ['PLAYER_COMPANY_TRANSFER', 'COMPANY_TRANSFER'],
      category: 'TRANSFER',
      taxpayer: 'RECIPIENT',
      jurisdictions: ['COMPANY_REGISTRATION'],
      rateBps: 1000,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    });
    const money = new MonetaryService(db);
    const person = { id: owner.founderId, admin: false };
    const personal = {
      idempotencyKey: crypto.randomUUID(),
      currencyId,
      recipientId: first.id,
      recipientType: 'COMPANY' as const,
      amountMinor: '100',
      purpose: 'Personal company payment',
    };
    const quote = await money.quote(person.id, personal);
    expect(quote.calculation).toMatchObject({
      event: 'PLAYER_COMPANY_TRANSFER',
      recipientKind: 'COMPANY',
      recipientCreditMinor: '90',
    });
    await money.transfer(person.id, { ...personal, quoteId: quote.id });
    const officer = { id: owner.citizenId, admin: false };
    const decisions = new CompanyDecisionService(db);
    const outgoing = await preparedPayment(first, {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '100',
      purpose: 'Corporate to player',
      recipient: { type: 'PLAYER', id: person.id },
    });
    const id = await decisions.create(first.id, officer, outgoing);
    const [operation] = await db
      .select()
      .from(economicOperations)
      .where(eq(economicOperations.companyDecisionId, id));
    expect(operation).toMatchObject({
      senderId: first.id,
      senderKind: 'COMPANY',
      actorId: officer.id,
      initiatorId: officer.id,
      event: 'COMPANY_PLAYER_TRANSFER',
    });
    expect(operation?.calculation.totalDebitMinor).toBe('105');
    const incoming = await preparedPayment(first, {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '100',
      purpose: 'Corporate to company',
      recipient: { type: 'COMPANY', id: second.id },
    });
    const replay = await Promise.all([
      decisions.create(first.id, officer, incoming),
      decisions.create(first.id, officer, incoming),
    ]);
    expect(replay[0]).toBe(replay[1]);
    const finance = new CompanyFinanceService(db);
    expect((await finance.wallet(first.id, officer)).accounts[0]?.balanceMinor).toBe('9880');
    expect((await finance.wallet(second.id, officer)).accounts[0]?.balanceMinor).toBe('10090');
    const [supply] = await db.select().from(currencies).where(eq(currencies.id, currencyId));
    expect(supply?.supplyMinor).toBe('1000000');
    expect(
      operation?.calculation.charges.some((charge) =>
        charge.claims.some(
          (claim) =>
            claim.lawId === senderLaw &&
            claim.evidence.some((evidence) => evidence.source === 'COMPANY_REGISTRATION'),
        ),
      ),
    ).toBe(true);
    if (operation === undefined) {
      throw new Error('Corporate operation missing');
    }
    await expect(
      new TaxationService(db).operation(operation.id, owner.founderId),
    ).rejects.toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  });
  it('binds replacement/exemption and additional rules to the exact company and preserves independent claims', async () => {
    const { db, home: owner } = context();
    const company = await registeredTaxCompany(db, owner);
    const other = await registeredTaxCompany(db, owner);
    await fund(company.id);
    const base: TaxRule = {
      event: 'COMPANY_TRANSFER',
      category: 'INCOME',
      taxpayer: 'SENDER',
      jurisdictions: ['COMPANY_REGISTRATION'],
      rateBps: 1000,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    };
    const baseId = await enact(base);
    const replacementId = await enact({
      ...base,
      rateBps: 250,
      regime: { companyId: company.id, branchId: null, mode: 'REPLACE', targetLawId: baseId },
    });
    const additionalId = await enact({
      ...base,
      category: 'CONTRIBUTION',
      rateBps: 100,
      regime: { companyId: company.id, branchId: null, mode: 'ADDITIONAL', targetLawId: null },
    });
    const payment: CorporatePayment = {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '1000',
      purpose: 'Special national treatment',
      recipient: { type: 'COMPANY', id: other.id },
    };
    const command = await preparedPayment(company, payment);
    const quote = await new CompanyPaymentQuoteService(db).create(
      company.id,
      { id: owner.citizenId, admin: false },
      { revisionId: company.revisionId, payment },
    );
    const replaced = quote.calculation.charges.find((charge) => charge.key === `law:${baseId}`);
    expect(replaced?.amountMinor).toBe('25');
    expect(replaced?.claims[0]?.regime?.lawId).toBe(replacementId);
    expect(
      quote.calculation.charges.find((charge) => charge.key === `law:${additionalId}`)?.amountMinor,
    ).toBe('10');
    await exemptCompanyLaw(company.id, base, { baseId, replacementId });
    await expect(
      new CompanyDecisionService(db).create(
        company.id,
        { id: owner.citizenId, admin: false },
        command,
      ),
    ).rejects.toMatchObject({ code: 'TAX_QUOTE_STALE' });
    const fresh = await preparedPayment(company, {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '1000',
      purpose: 'Fresh exempt terms',
      recipient: { type: 'COMPANY', id: other.id },
    });
    await new CompanyDecisionService(db).create(
      company.id,
      { id: owner.citizenId, admin: false },
      fresh,
    );
    const wallet = await new CompanyFinanceService(db).wallet(company.id, {
      id: owner.citizenId,
      admin: false,
    });
    expect(wallet.accounts[0]?.balanceMinor).toBe('8940');
    await expect(
      enact(
        {
          ...base,
          regime: { companyId: company.id, branchId: null, mode: 'EXEMPT', targetLawId: baseId },
          rateBps: 0,
        },
        context().foreign,
      ),
    ).rejects.toMatchObject({ code: 'COMPANY_TAX_BASE_INVALID' });
  });
  it('rejects changed tax terms after multi-office approval without moving principal or fractional obligations', async () => {
    const { db, home: owner } = context();
    const company = await registeredTaxCompany(db, owner, true);
    await fund(company.id);
    const command = await preparedPayment(company, {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '100',
      purpose: 'Exact approved tax snapshot',
      recipient: { type: 'PLAYER', id: owner.founderId },
    });
    const decisions = new CompanyDecisionService(db);
    const id = await decisions.create(company.id, { id: owner.citizenId, admin: false }, command);
    if (company.secondOfficeId === null) {
      throw new Error('Second office missing');
    }
    await decisions.approve(id, { id: owner.founderId, admin: false }, company.secondOfficeId);
    const before = await db.select().from(taxFractionalBalances).orderBy(taxFractionalBalances.key);
    await enact({
      event: 'COMPANY_PLAYER_TRANSFER',
      category: 'CONTRIBUTION',
      taxpayer: 'SENDER',
      jurisdictions: ['COMPANY_REGISTRATION'],
      rateBps: 100,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
      regime: { companyId: company.id, branchId: null, mode: 'ADDITIONAL', targetLawId: null },
    });
    await expect(decisions.apply(id, { id: owner.founderId, admin: false })).rejects.toMatchObject({
      code: 'TAX_QUOTE_STALE',
    });
    expect(
      await db
        .select()
        .from(ledgerTransactions)
        .where(eq(ledgerTransactions.companyDecisionId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(taxFractionalBalances).orderBy(taxFractionalBalances.key),
    ).toEqual(before);
    expect(
      (
        await new CompanyFinanceService(db).wallet(company.id, {
          id: owner.citizenId,
          admin: false,
        })
      ).accounts[0]?.balanceMinor,
    ).toBe('10000');
  });
  it('applies branch obligations only to an actual active branch attributed in the approved corporate payment', async () => {
    const { db, home: owner, foreign: host } = context();
    const company = await registeredTaxCompany(db, owner);
    await fund(company.id);
    const policy = await new PublicCompanyBranchService(db).policy(host.stateId);
    if (policy === null) {
      throw new Error('Host policy missing');
    }
    const branchId = crypto.randomUUID();
    await new CompanyDecisionService(db).create(
      company.id,
      { id: owner.citizenId, admin: false },
      {
        revisionId: company.revisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'REGISTER_BRANCH',
          branchId,
          stateId: host.stateId,
          policyRevisionId: policy.id,
          name: { en: 'Actual foreign presence' },
          description: {},
        },
      },
    );
    const branchLaw = await enact(
      {
        event: 'COMPANY_PLAYER_TRANSFER',
        category: 'CONTRIBUTION',
        taxpayer: 'SENDER',
        jurisdictions: ['BRANCH_REGISTRATION'],
        rateBps: 700,
        recipient: 'STATE_TREASURY',
        currencyIds: [],
      },
      host,
    );
    const payment: CorporatePayment = {
      kind: 'TRANSFER_FUNDS',
      currencyId,
      amountMinor: '100',
      purpose: 'Attributed branch payment',
      recipient: { type: 'PLAYER', id: owner.founderId },
    };
    const service = new CompanyPaymentQuoteService(db);
    const plain = await service.create(
      company.id,
      { id: owner.citizenId, admin: false },
      { revisionId: company.revisionId, payment },
    );
    expect(
      plain.calculation.charges.some((charge) =>
        charge.claims.some((claim) => claim.lawId === branchLaw),
      ),
    ).toBe(false);
    const command = await preparedPayment(company, { ...payment, sourceBranchId: branchId });
    await new CompanyDecisionService(db).create(
      company.id,
      { id: owner.citizenId, admin: false },
      command,
    );
    const wallet = await new CompanyFinanceService(db).wallet(company.id, {
      id: owner.citizenId,
      admin: false,
    });
    expect(
      wallet.transactions.some(
        (entry) => entry.companyDecisionId !== null && entry.economicOperationId !== null,
      ),
    ).toBe(true);
    await expect(
      service.create(
        company.id,
        { id: owner.citizenId, admin: false },
        {
          revisionId: company.revisionId,
          payment: { ...payment, sourceBranchId: crypto.randomUUID() },
        },
      ),
    ).rejects.toMatchObject({ code: 'COMPANY_BRANCH_CONTEXT_UNAVAILABLE' });
  });
});
