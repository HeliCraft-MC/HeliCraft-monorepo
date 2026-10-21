// oxlint-disable import/max-dependencies -- Corporate finances exercise real state/corporate Governance, exact journals, protected access and publication on disposable PostgreSQL.
// oxlint-disable max-lines -- Independent funding, privacy, approval and integrity scenarios share two real states and currencies.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  companies,
  currencies,
  financialAccounts,
  ledgerTransactions,
  ledgerPostings,
} from '../src/db/schema';
import { createApp } from '../src/app';
import { SessionService } from '../src/modules/sessions/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { CompanyFinanceService, CompanyWalletSchema } from '../src/modules/companies/finance';
import { PublicCompanyDirectoryService } from '../src/modules/companies/public-directory';
import { listCompanyCatalogue } from '../src/modules/companies/catalogue';
import { CompanyCatalogueQuerySchema } from '../src/modules/companies/catalogue-contracts';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { account, post } from '../src/modules/monetary/ledger';
import { currencyRecord } from '../src/modules/monetary/store';
import { companyActor } from '../src/modules/companies/store';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishMoney } from './taxation-fixture';
import {
  freeCompanyPolicy,
  officeCompanyConfiguration,
  prepareCompany,
  submitPreparedCompany,
} from './companies-fixture';

type StateFixture = Awaited<ReturnType<typeof monetaryFixture>>;
let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
let home: StateFixture | null = null;
let foreign: StateFixture | null = null;
let localCurrency = '';
let foreignCurrency = '';
function context(): { db: Database['db']; home: StateFixture; foreign: StateFixture } {
  if (!database || !home || !foreign) {
    throw new Error('Corporate finance fixture unavailable');
  }
  return { db: database.db, home, foreign };
}
async function revision(companyId: string): Promise<string> {
  const [company] = await context().db.select().from(companies).where(eq(companies.id, companyId));
  if (company?.currentRevisionId === null || company?.currentRevisionId === undefined) {
    throw new Error('Company charter missing');
  }
  return company.currentRevisionId;
}
async function registeredCompany(
  multiple = false,
  name = 'Ledger_%_Demo',
): Promise<{ id: string; secondOfficeId: string | null }> {
  const { db, home: owner } = context();
  const configuration = officeCompanyConfiguration(owner.founderId, owner.stateId);
  configuration.name = { en: name, ru: 'Действительная финансовая компания' };
  const [first] = configuration.charter.offices;
  if (!first) {
    throw new Error('Company office missing');
  }
  first.initialHolderIds = [owner.citizenId];
  let secondOfficeId: string | null = null;
  if (multiple) {
    secondOfficeId = crypto.randomUUID();
    configuration.charter.offices.push({
      ...first,
      id: secondOfficeId,
      name: { en: 'Independent financial approver' },
      initialHolderIds: [owner.founderId],
    });
    const offices = [first.id, secondOfficeId];
    configuration.charter.policies = configuration.charter.policies.map((policy) =>
      policy.action === 'TRANSFER_FUNDS'
        ? {
            ...policy,
            procedure: {
              mechanism: 'MULTIPLE_OFFICES',
              officeIds: offices,
              vote: null,
              manualProcedure: {},
            },
          }
        : policy,
    );
  }
  const draft = await prepareCompany(db, { applicantId: owner.founderId, configuration });
  await submitPreparedCompany(db, draft);
  return { id: draft.companyId, secondOfficeId };
}
async function fund(
  companyId: string,
  amountMinor: string,
  funding: Readonly<{ issuer: StateFixture; currencyId: string }>,
): Promise<string> {
  const { issuer, currencyId } = funding;
  return await new MonetaryDirectiveService(context().db).create(
    issuer.stateId,
    { id: issuer.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'BANK_TRANSFER',
        currencyId,
        amountMinor,
        purpose: 'Official corporate funding',
        recipient: { type: 'COMPANY', companyId },
      },
    },
  );
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  home = await monetaryFixture(database.db, 'Fh');
  foreign = await monetaryFixture(database.db, 'Ff');
  await addEconomicAuthority(database.db, home);
  await addEconomicAuthority(database.db, foreign);
  localCurrency = await establishMoney(database.db, home);
  foreignCurrency = await establishMoney(database.db, foreign, 'CFO');
  const directives = new MonetaryDirectiveService(database.db);
  await directives.create(
    home.stateId,
    { id: home.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'SET_COMPANY_REGISTRATION_POLICY',
        baseRevisionId: null,
        policy: freeCompanyPolicy,
      },
    },
  );
  await directives.create(
    home.stateId,
    { id: home.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'ISSUE',
        currencyId: localCurrency,
        amountMinor: '900719925474099312345',
        purpose: 'Exact large balance fixture',
      },
    },
  );
});
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Independent corporate money scenarios retain their complete real Governance and journal histories.
describe('official corporate accounts', () => {
  it('accepts exact local/foreign official funding without granting an owner private financial access', async () => {
    const { db, home: owner, foreign: other } = context();
    const company = await registeredCompany();
    await fund(company.id, '900719925474099312345', { issuer: owner, currencyId: localCurrency });
    await fund(company.id, '12345', { issuer: other, currencyId: foreignCurrency });
    const finance = new CompanyFinanceService(db);
    const wallet = await finance.wallet(company.id, { id: owner.citizenId, admin: false });
    expect(wallet.accounts).toHaveLength(2);
    expect(wallet.accounts.find((item) => item.currencyId === localCurrency)).toMatchObject({
      kind: 'COMPANY',
      ownerId: company.id,
      balanceMinor: '900719925474099312345',
    });
    expect(wallet.accounts.find((item) => item.currencyId === foreignCurrency)?.balanceMinor).toBe(
      '12345',
    );
    await expect(
      finance.wallet(company.id, { id: owner.founderId, admin: false }),
    ).rejects.toMatchObject({ code: 'COMPANY_FINANCES_NOT_FOUND' });
    await expect(
      finance.wallet(company.id, { id: owner.founderId, admin: true }),
    ).rejects.toMatchObject({ status: 403 });
    const [supply] = await db.select().from(currencies).where(eq(currencies.id, localCurrency));
    expect(supply?.supplyMinor).toBe('900719925474100312345');
    await db.transaction(async (transaction) => {
      await companyActor(transaction, owner.citizenId);
      await account(transaction, {
        currencyId: localCurrency,
        kind: 'COMPANY',
        ownerId: company.id,
      });
      await account(transaction, {
        currencyId: localCurrency,
        kind: 'COMPANY',
        ownerId: company.id,
      });
    });
    expect(
      await db
        .select()
        .from(financialAccounts)
        .where(
          and(eq(financialAccounts.kind, 'COMPANY'), eq(financialAccounts.ownerId, company.id)),
        ),
    ).toHaveLength(2);
  });
  it('funds a company from a treasury and permits only its actual financial officer to return money through an immutable decision', async () => {
    const { db, home: owner } = context();
    const company = await registeredCompany();
    const directives = new MonetaryDirectiveService(db);
    const actor = { id: owner.founderId, admin: false };
    await directives.create(owner.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'BANK_TRANSFER',
        currencyId: localCurrency,
        amountMinor: '10000',
        purpose: '',
        recipient: { type: 'TREASURY' },
      },
    });
    const command = {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TREASURY_TRANSFER' as const,
        currencyId: localCurrency,
        amountMinor: '1000',
        purpose: 'Treasury corporate funding',
        recipient: { type: 'COMPANY' as const, companyId: company.id },
      },
    };
    const funded = await Promise.all([
      directives.create(owner.stateId, actor, command),
      directives.create(owner.stateId, actor, command),
    ]);
    expect(funded[0]).toBe(funded[1]);
    const decisions = new CompanyDecisionService(db);
    const payment = {
      revisionId: await revision(company.id),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TRANSFER_FUNDS' as const,
        currencyId: localCurrency,
        amountMinor: '123',
        purpose: 'Authorized treasury remittance',
        recipient: { type: 'STATE' as const, id: owner.stateId },
      },
    };
    await expect(decisions.create(company.id, actor, payment)).rejects.toMatchObject({
      code: 'COMPANY_AUTHORITY_REQUIRED',
    });
    const officer = { id: owner.citizenId, admin: false };
    const completed = await Promise.all([
      decisions.create(company.id, officer, payment),
      decisions.create(company.id, officer, payment),
    ]);
    expect(completed[0]).toBe(completed[1]);
    const [completedId] = completed;
    if (completedId === undefined) {
      throw new Error('Corporate payment decision missing');
    }
    await expect(decisions.detail(completedId, actor)).rejects.toMatchObject({
      code: 'COMPANY_FINANCES_NOT_FOUND',
    });
    expect((await decisions.detail(completedId, officer)).status).toBe('APPLIED');
    const wallet = await new CompanyFinanceService(db).wallet(company.id, officer);
    expect(wallet.accounts[0]?.balanceMinor).toBe('877');
    expect(wallet.transactions[0]).toMatchObject({
      amountMinor: '123',
      actorId: officer.id,
      initiatorId: officer.id,
      companyDecisionId: completed[0],
      directiveId: null,
      purpose: payment.payload.purpose,
    });
    expect(wallet.transactions[0]?.postings).toHaveLength(2);
    expect(wallet.transactions[0]?.postings.map((posting) => posting.deltaMinor)).toEqual(
      expect.arrayContaining(['-123', '123']),
    );
    await expect(
      decisions.create(company.id, officer, {
        ...payment,
        idempotencyKey: crypto.randomUUID(),
        payload: { ...payment.payload, recipient: { type: 'PLAYER', id: owner.founderId } },
      }),
    ).rejects.toMatchObject({ code: 'TAX_QUOTE_STALE' });
  });
  it('distinguishes the initiating officer from the other authorized executing officer', async () => {
    const { db, home: owner } = context();
    const company = await registeredCompany(true);
    await fund(company.id, '500', { issuer: owner, currencyId: localCurrency });
    const initiator = { id: owner.citizenId, admin: false };
    const executor = { id: owner.founderId, admin: false };
    const decisions = new CompanyDecisionService(db);
    const id = await decisions.create(company.id, initiator, {
      revisionId: await revision(company.id),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TRANSFER_FUNDS',
        currencyId: localCurrency,
        amountMinor: '100',
        purpose: 'Separate initiator and executor',
        recipient: { type: 'STATE', id: owner.stateId },
      },
    });
    if (company.secondOfficeId === null) {
      throw new Error('Second financial office missing');
    }
    await decisions.approve(id, executor, company.secondOfficeId);
    await decisions.apply(id, executor);
    await decisions.apply(id, initiator);
    const wallet = await new CompanyFinanceService(db).wallet(company.id, executor);
    expect(wallet.accounts[0]?.balanceMinor).toBe('400');
    expect(wallet.transactions.filter((item) => item.companyDecisionId === id)).toMatchObject([
      { initiatorId: initiator.id, actorId: executor.id, amountMinor: '100' },
    ]);
    expect(wallet.transactions.find((item) => item.directiveId !== null)).toMatchObject({
      initiatorId: owner.founderId,
      actorId: owner.founderId,
    });
  });
  it('keeps a multi-office payment unexecuted after its creator loses the required appointment', async () => {
    const { db, home: owner } = context();
    const company = await registeredCompany(true);
    await fund(company.id, '500', { issuer: owner, currencyId: localCurrency });
    const officer = { id: owner.citizenId, admin: false };
    const decisions = new CompanyDecisionService(db);
    const id = await decisions.create(company.id, officer, {
      revisionId: await revision(company.id),
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TRANSFER_FUNDS',
        currencyId: localCurrency,
        amountMinor: '100',
        purpose: 'Requires two actual offices',
        recipient: { type: 'STATE', id: owner.stateId },
      },
    });
    const proof = await decisions.proof(id, officer);
    expect(proof.record.status).toBe('PENDING');
    const held = proof.holders.find((holder) => holder.userId === officer.id);
    if (!held || company.secondOfficeId === null) {
      throw new Error('Current financial appointments missing');
    }
    await decisions.create(company.id, officer, {
      revisionId: await revision(company.id),
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'REMOVE_OFFICE_HOLDER', officeId: held.officeId, userId: officer.id },
    });
    await expect(
      decisions.approve(id, { id: owner.founderId, admin: false }, company.secondOfficeId),
    ).rejects.toMatchObject({ code: 'COMPANY_APPROVAL_UNAVAILABLE' });
    const wallet = await new CompanyFinanceService(db).wallet(company.id, {
      id: owner.founderId,
      admin: false,
    });
    expect(wallet.accounts[0]?.balanceMinor).toBe('500');
    expect(
      await db
        .select()
        .from(ledgerTransactions)
        .where(eq(ledgerTransactions.companyDecisionId, id)),
    ).toHaveLength(0);
  });
  it('rejects fabricated accounts and journal sources and rolls back every posting on failure', async () => {
    const { db, home: owner } = context();
    const company = await registeredCompany();
    await fund(company.id, '500', { issuer: owner, currencyId: localCurrency });
    const draft = await new CompanyDraftService(db).create(
      owner.founderId,
      'Private unregistered identity',
    );
    await expect(
      db
        .insert(financialAccounts)
        .values({ currencyId: localCurrency, kind: 'COMPANY', ownerId: draft.companyId }),
    ).rejects.toThrow();
    await expect(
      db.transaction(async (transaction) => {
        await companyActor(transaction, owner.citizenId);
        const currency = await currencyRecord(transaction, localCurrency);
        await post(transaction, {
          actorId: owner.citizenId,
          key: crypto.randomUUID(),
          hash: '0'.repeat(64),
          currency,
          kind: 'TRANSFER',
          amountMinor: '10',
          purpose: 'No corporate decision',
          source: await account(transaction, {
            currencyId: localCurrency,
            kind: 'COMPANY',
            ownerId: company.id,
          }),
          target: await account(transaction, {
            currencyId: localCurrency,
            kind: 'TREASURY',
            ownerId: owner.stateId,
          }),
          directiveId: null,
          policyRevisionId: null,
        });
      }),
    ).rejects.toThrow();
    const wallet = await new CompanyFinanceService(db).wallet(company.id, {
      id: owner.citizenId,
      admin: false,
    });
    expect(wallet.accounts[0]?.balanceMinor).toBe('500');
    const [entry] = wallet.transactions;
    if (!entry) {
      throw new Error('Funding history missing');
    }
    await expect(
      db
        .update(ledgerTransactions)
        .set({ companyDecisionId: crypto.randomUUID() })
        .where(eq(ledgerTransactions.id, entry.id)),
    ).rejects.toThrow();
    await expect(
      db.delete(ledgerPostings).where(eq(ledgerPostings.transactionId, entry.id)),
    ).rejects.toThrow();
  });
  it('filters and paginates published company identities with literal search and deterministic localized ordering', async () => {
    const { db, home: owner, foreign: other } = context();
    const expectedIds: string[] = [];
    const prefix = 'Catalogue_%_';
    const count = 13;
    for (let index = 0; index < count; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- Real registrations deliberately establish chronological order across separate committed Governance transactions.
      const company = await registeredCompany(false, `${prefix}${String(index).padStart(2, '0')}`);
      expectedIds.push(company.id);
    }
    const configuration = officeCompanyConfiguration(owner.founderId, owner.stateId);
    configuration.name = { en: `${prefix}private draft` };
    const draft = await prepareCompany(db, { applicantId: owner.founderId, configuration });
    const query = CompanyCatalogueQuerySchema.parse({
      search: prefix,
      sort: 'NAME',
      locale: 'en',
      stateId: owner.stateId,
    });
    const first = await listCompanyCatalogue(db, query);
    expect(first.total).toBe(count);
    expect(first.items.map((item) => item.id)).toEqual(expectedIds.slice(0, 12));
    expect(first.items.some((item) => item.id === draft.companyId)).toBe(false);
    expect(first.jurisdictions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: owner.stateId })]),
    );
    const last = await listCompanyCatalogue(db, { ...query, page: 999 });
    expect(last.page).toBe(2);
    expect(last.items.map((item) => item.id)).toEqual(expectedIds.slice(12));
    const newest = await listCompanyCatalogue(db, { ...query, sort: 'NEWEST' });
    const oldest = await listCompanyCatalogue(db, { ...query, sort: 'OLDEST' });
    expect(newest.items[0]?.id).toBe(expectedIds.at(-1));
    expect(oldest.items[0]?.id).toBe(expectedIds[0]);
    expect((await listCompanyCatalogue(db, { ...query, stateId: other.stateId })).total).toBe(0);
    expect((await listCompanyCatalogue(db, { ...query, status: 'CLOSED' })).total).toBe(0);
    const app = createApp({
      db,
      siteOrigin: 'https://corporate-catalogue.test',
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const response = await app.request(
      `/api/v1/public/companies/catalogue?search=${encodeURIComponent(prefix)}&locale=en`,
      { headers: { Cookie: 'helicraft_session=invalid' } },
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(draft.companyId);
    expect(body).not.toContain('balanceMinor');
    expect(body).not.toContain('charter');
    expect((await app.request('/api/v1/public/companies/catalogue?status=DRAFT')).status).toBe(400);
  });
  it('keeps draft identities and balances out of public search and protects the actual wallet HTTP boundary', async () => {
    const { db, home: owner } = context();
    const company = await registeredCompany();
    await fund(company.id, '100', { issuer: owner, currencyId: localCurrency });
    const draft = await new CompanyDraftService(db).create(owner.founderId, 'Secret company');
    const directory = new PublicCompanyDirectoryService(db);
    const published = await directory.list({ query: '_%' });
    expect(published.items.some((item) => item.id === company.id)).toBe(true);
    expect(published.items.some((item) => item.id === draft.companyId)).toBe(false);
    await expect(directory.identity(draft.companyId)).rejects.toMatchObject({
      code: 'COMPANY_NOT_FOUND',
    });
    const app = createApp({
      db,
      siteOrigin: 'https://corporate-money.test',
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const path = `/api/v1/account/companies/${company.id}/finances`;
    expect((await app.request(path)).status).toBe(401);
    const sessions = new SessionService(db);
    const ownerToken = await sessions.issue(owner.founderId);
    const officerToken = await sessions.issue(owner.citizenId);
    expect(
      (await app.request(path, { headers: { Cookie: `helicraft_session=${ownerToken}` } })).status,
    ).toBe(404);
    const privateResponse = await app.request(path, {
      headers: { Cookie: `helicraft_session=${officerToken}` },
    });
    expect(privateResponse.status).toBe(200);
    expect(privateResponse.headers.get('Cache-Control')).toBe('no-store');
    expect(CompanyWalletSchema.parse(await privateResponse.json()).accounts[0]?.balanceMinor).toBe(
      '100',
    );
    const publicResponse = await app.request('/api/v1/public/companies?query=Ledger', {
      headers: { Cookie: 'helicraft_session=invalid' },
    });
    const body = await publicResponse.text();
    expect(publicResponse.status).toBe(200);
    expect(body).not.toContain('balanceMinor');
    expect(body).not.toContain('charter');
    expect(body).not.toContain(draft.companyId);
  });
});
