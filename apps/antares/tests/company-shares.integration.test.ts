// oxlint-disable import/max-dependencies -- Stock scenarios exercise real registration, owner Governance, consent, portfolios and immutable PostgreSQL journals.
// oxlint-disable max-lines -- Independent consent, supply, owner authority and concurrent graph scenarios share one disposable database fixture.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  companies,
  companyShareEvents,
  companyShareOperations,
  companyShareAcceptances,
} from '../src/db/schema';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
import {
  freeCompanyPolicy,
  officeCompanyConfiguration,
  prepareCompany,
  submitPreparedCompany,
} from './companies-fixture';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { ShareOperationService } from '../src/modules/companies/share-operations';
import { ShareConsentService } from '../src/modules/companies/share-consents';
import { PersonalShareService } from '../src/modules/companies/share-settlement';
import { SharePortfolioService } from '../src/modules/companies/share-portfolio';
import { ShareHistoryService } from '../src/modules/companies/share-history';
import type {
  ShareTransfer,
  ShareIssue,
  ShareOperation,
} from '../src/modules/companies/ownership-contracts';

let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
let state: Awaited<ReturnType<typeof monetaryFixture>> | null = null;
function context(): { db: Database['db']; fixture: Awaited<ReturnType<typeof monetaryFixture>> } {
  if (!database || !state) {
    throw new Error('Share fixture unavailable');
  }
  return { db: database.db, fixture: state };
}
async function registeredCompany(
  approval = false,
  dualOffice = false,
): Promise<{ id: string; revisionId: string }> {
  const { db, fixture } = context();
  const configuration = officeCompanyConfiguration(fixture.founderId, fixture.stateId);
  if (dualOffice) {
    const [first] = configuration.charter.offices;
    if (!first) {
      throw new Error('Initial office missing');
    }
    const second = {
      ...first,
      id: crypto.randomUUID(),
      name: { en: 'Second independent office' },
      initialHolderIds: [fixture.citizenId],
    };
    configuration.charter.offices.push(second);
    configuration.charter.policies = configuration.charter.policies.map((policy) => ({
      ...policy,
      procedure: {
        mechanism: 'ANY_OF_OFFICES',
        officeIds: [first.id, second.id],
        vote: null,
        manualProcedure: {},
      },
    }));
  }
  if (approval) {
    configuration.charter.shareTransfers = 'CORPORATE_APPROVAL';
  }
  const draft = await prepareCompany(db, { applicantId: fixture.founderId, configuration });
  await submitPreparedCompany(db, draft);
  const [company] = await db.select().from(companies).where(eq(companies.id, draft.companyId));
  if (company?.currentRevisionId === undefined || company.currentRevisionId === null) {
    throw new Error('Company charter unavailable');
  }
  return { id: company.id, revisionId: company.currentRevisionId };
}
function transfer(
  company: Readonly<{ id: string; revisionId: string }>,
  shares = '1',
): ShareTransfer {
  const { fixture } = context();
  return {
    kind: 'TRANSFER',
    operationId: crypto.randomUUID(),
    issuerId: company.id,
    issuerRevisionId: company.revisionId,
    owner: { type: 'PLAYER', id: fixture.founderId },
    recipient: { type: 'PLAYER', id: fixture.citizenId },
    shares,
  };
}
async function prepare(operation: ShareOperation): Promise<void> {
  const { db, fixture } = context();
  await new ShareOperationService(db).create(fixture.founderId, {
    operation,
    idempotencyKey: crypto.randomUUID(),
  });
}
async function consent(operation: ShareOperation, actorId: string): Promise<string> {
  const { db } = context();
  const terms = await new ShareOperationService(db).get(operation.operationId, actorId);
  return await new ShareConsentService(db).grant(actorId, {
    operationId: operation.operationId,
    termsHash: terms.termsHash,
    idempotencyKey: crypto.randomUUID(),
  });
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  state = await monetaryFixture(database.db, 'Sh');
  await addEconomicAuthority(database.db, state);
  await new MonetaryDirectiveService(database.db).create(
    state.stateId,
    { id: state.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'SET_COMPANY_REGISTRATION_POLICY',
        baseRevisionId: null,
        policy: freeCompanyPolicy,
      },
    },
  );
});
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Related scenarios keep independent complete ownership histories in the same migrated disposable fixture.
describe('accepted exact stock operations', () => {
  it('requires the actual receiver and preserves consumed consent across idempotent retries', async () => {
    const { db, fixture } = context();
    const company = await registeredCompany();
    const operation = transfer(company, '19');
    await prepare(operation);
    const service = new PersonalShareService(db);
    const command = {
      operation,
      authorizationDecisionId: null,
      idempotencyKey: crypto.randomUUID(),
    };
    await expect(service.transfer(fixture.founderId, command)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_CONSENT_REQUIRED',
    });
    await expect(consent(operation, fixture.founderId)).rejects.toMatchObject({
      code: 'SHARE_RECIPIENT_REQUIRED',
    });
    const consents = new ShareConsentService(db);
    const first = await consent(operation, fixture.citizenId);
    await expect(consents.revoke(first, fixture.adminId)).rejects.toMatchObject({
      code: 'SHARE_CONSENT_NOT_FOUND',
    });
    await consents.revoke(first, fixture.citizenId);
    await expect(service.transfer(fixture.founderId, command)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_CONSENT_REQUIRED',
    });
    const second = await consent(operation, fixture.citizenId);
    const events = await Promise.all([
      service.transfer(fixture.founderId, command),
      service.transfer(fixture.founderId, command),
    ]);
    expect(events).toEqual([operation.operationId, operation.operationId]);
    const view = await new ShareOperationService(db).get(operation.operationId, fixture.citizenId);
    expect(view.consents).toMatchObject([
      { id: first, status: 'REVOKED' },
      { id: second, status: 'CONSUMED', eventId: operation.operationId },
    ]);
    await expect(consents.revoke(second, fixture.citizenId)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_COMPLETE',
    });
    await expect(
      service.transfer(fixture.founderId, {
        ...command,
        operation: { ...operation, shares: '18' },
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(
      db
        .update(companyShareOperations)
        .set({ termsHash: '0'.repeat(64) })
        .where(eq(companyShareOperations.id, operation.operationId)),
    ).rejects.toThrow();
    const portfolio = await new SharePortfolioService(db).personal({
      id: fixture.citizenId,
      admin: false,
    });
    expect(portfolio.items.find((item) => item.issuerId === company.id)).toMatchObject({
      shares: '19',
      issuedShares: '37',
      controls: true,
    });
    const historyService = new ShareHistoryService(db);
    const history = await historyService.list(company.id, { id: fixture.founderId, admin: false });
    expect(history.items).toMatchObject([
      { id: operation.operationId, kind: 'TRANSFER', operation },
      { kind: 'INITIAL', operation: null },
    ]);
    expect(
      history.items.map((item) =>
        item.postings.reduce((total, posting) => total + BigInt(posting.delta), 0n),
      ),
    ).toEqual([0n, 37n]);
    await expect(
      historyService.list(company.id, { id: fixture.adminId, admin: false }),
    ).rejects.toMatchObject({ code: 'COMPANY_NOT_FOUND' });
  });
  it('serializes two different transfers so that an owner cannot spend the same shares twice', async () => {
    const { db, fixture } = context();
    const company = await registeredCompany();
    const first = transfer(company, '25');
    const second = {
      ...transfer(company, '25'),
      recipient: { type: 'PLAYER' as const, id: fixture.adminId },
    };
    await prepare(first);
    await prepare(second);
    await consent(first, fixture.citizenId);
    await consent(second, fixture.adminId);
    const service = new PersonalShareService(db);
    const results = await Promise.allSettled(
      [first, second].map(
        async (operation) =>
          await service.transfer(fixture.founderId, {
            operation,
            authorizationDecisionId: null,
            idempotencyKey: crypto.randomUUID(),
          }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(
      await db
        .select()
        .from(companyShareEvents)
        .where(eq(companyShareEvents.companyId, company.id)),
    ).toHaveLength(2);
    const portfolio = await new SharePortfolioService(db).personal({
      id: fixture.founderId,
      admin: false,
    });
    expect(portfolio.items.find((item) => item.issuerId === company.id)?.shares).toBe('12');
  });
  it('issues exact large lots only after every personal, corporate and state receiver consents', async () => {
    const { db, fixture } = context();
    const issuer = await registeredCompany();
    const receiver = await registeredCompany();
    const actor = { id: fixture.founderId, admin: false };
    const operation: ShareIssue = {
      kind: 'ISSUE',
      operationId: crypto.randomUUID(),
      issuerId: issuer.id,
      issuerRevisionId: issuer.revisionId,
      shares: '27021597764222979',
      allocations: [
        { owner: { type: 'PLAYER', id: fixture.citizenId }, shares: '9007199254740993' },
        { owner: { type: 'COMPANY', id: receiver.id }, shares: '9007199254740993' },
        { owner: { type: 'STATE', id: fixture.stateId }, shares: '9007199254740993' },
      ],
    };
    await prepare(operation);
    await consent(operation, fixture.citizenId);
    const decisions = new CompanyDecisionService(db);
    const issueCommand = {
      revisionId: issuer.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ISSUE_SHARES' as const, operation },
    };
    await expect(decisions.create(issuer.id, actor, issueCommand)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_CONSENT_REQUIRED',
    });
    await decisions.create(receiver.id, actor, {
      revisionId: receiver.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation },
    });
    const directives = new MonetaryDirectiveService(db);
    await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation },
    });
    await decisions.create(issuer.id, actor, issueCommand);
    const [issued] = await db.select().from(companies).where(eq(companies.id, issuer.id));
    expect(issued?.issuedShares).toBe('27021597764223016');
    expect(
      await db
        .select()
        .from(companyShareAcceptances)
        .where(eq(companyShareAcceptances.eventId, operation.operationId)),
    ).toHaveLength(3);
    const portfolio = new SharePortfolioService(db);
    expect(
      (await portfolio.company(receiver.id, actor)).items.find(
        (item) => item.issuerId === issuer.id,
      ),
    ).toMatchObject({ shares: '9007199254740993', controls: false });
    const disposal: ShareTransfer = {
      ...transfer(issuer),
      owner: { type: 'STATE', id: fixture.stateId },
      shares: '9007199254740993',
    };
    await prepare(disposal);
    await consent(disposal, fixture.citizenId);
    await expect(
      new PersonalShareService(db).transfer(actor.id, {
        operation: disposal,
        authorizationDecisionId: null,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'PERSONAL_SHARE_OWNER_REQUIRED' });
    await directives.create(fixture.stateId, actor, {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'TRANSFER_COMPANY_SHARES',
        operation: disposal,
        authorizationDecisionId: null,
      },
    });
    expect(
      (await portfolio.state(fixture.stateId, actor)).items.find(
        (item) => item.issuerId === issuer.id,
      ),
    ).toBeUndefined();
  });
  it('requires a separate exact issuer approval when the published charter demands it', async () => {
    const { db, fixture } = context();
    const issuer = await registeredCompany(true);
    const operation = transfer(issuer);
    await prepare(operation);
    await consent(operation, fixture.citizenId);
    const service = new PersonalShareService(db);
    const command = {
      operation,
      authorizationDecisionId: null,
      idempotencyKey: crypto.randomUUID(),
    };
    await expect(service.transfer(fixture.founderId, command)).rejects.toMatchObject({
      code: 'SHARE_ISSUER_APPROVAL_REQUIRED',
    });
    const approval = await new CompanyDecisionService(db).create(
      issuer.id,
      { id: fixture.founderId, admin: false },
      {
        revisionId: issuer.revisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: { kind: 'AUTHORIZE_SHARE_TRANSFER', operation },
      },
    );
    await service.transfer(fixture.founderId, { ...command, authorizationDecisionId: approval });
    const next = transfer(issuer);
    await prepare(next);
    await consent(next, fixture.citizenId);
    await expect(
      service.transfer(fixture.founderId, {
        operation: next,
        authorizationDecisionId: approval,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'SHARE_ISSUER_APPROVAL_STALE' });
    const actor = { id: fixture.founderId, admin: false };
    const decisions = new CompanyDecisionService(db);
    const nextApproval = await decisions.create(issuer.id, actor, {
      revisionId: issuer.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'AUTHORIZE_SHARE_TRANSFER', operation: next },
    });
    await decisions.create(issuer.id, actor, {
      revisionId: issuer.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'UPDATE_PROFILE',
        name: { en: 'Changed issuer revision' },
        description: {},
        categories: [],
      },
    });
    await expect(
      service.transfer(actor.id, {
        operation: next,
        authorizationDecisionId: nextApproval,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'SHARE_ISSUER_STALE' });
    expect(
      (await new ShareOperationService(db).get(next.operationId, actor.id)).consents,
    ).toMatchObject([{ status: 'STALE' }]);
  });
  it('rechecks actual recipient authority and accepts a later valid source without reviving an obsolete grant', async () => {
    const { db, fixture } = context();
    const issuer = await registeredCompany();
    const receiver = await registeredCompany(false, true);
    const actor = { id: fixture.founderId, admin: false };
    const secondActor = { id: fixture.citizenId, admin: false };
    const operation = {
      ...transfer(issuer),
      recipient: { type: 'COMPANY' as const, id: receiver.id },
    };
    await prepare(operation);
    const decisions = new CompanyDecisionService(db);
    const command = {
      revisionId: receiver.revisionId,
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION' as const, operation },
    };
    await decisions.create(receiver.id, actor, { ...command, idempotencyKey: crypto.randomUUID() });
    const operations = new ShareOperationService(db);
    const [first] = (await operations.get(operation.operationId, actor.id)).consents;
    if (!first) {
      throw new Error('Consent missing');
    }
    await decisions.create(receiver.id, actor, {
      revisionId: receiver.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'REVOKE_SHARE_ACQUISITION', consentId: first.id },
    });
    const transfers = new PersonalShareService(db);
    const settlement = {
      operation,
      authorizationDecisionId: null,
      idempotencyKey: crypto.randomUUID(),
    };
    await expect(transfers.transfer(actor.id, settlement)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_CONSENT_REQUIRED',
    });
    await decisions.create(receiver.id, actor, { ...command, idempotencyKey: crypto.randomUUID() });
    if (first.companyDecisionId === null) {
      throw new Error('Corporate source missing');
    }
    const proof = await decisions.proof(first.companyDecisionId, actor);
    const office = proof.holders.find((holder) => holder.userId === actor.id);
    if (!office) {
      throw new Error('Actual appointment missing');
    }
    await decisions.create(receiver.id, actor, {
      revisionId: receiver.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'REMOVE_OFFICE_HOLDER', officeId: office.officeId, userId: actor.id },
    });
    await expect(transfers.transfer(actor.id, settlement)).rejects.toMatchObject({
      code: 'SHARE_ACQUISITION_CONSENT_REQUIRED',
    });
    await decisions.create(receiver.id, secondActor, {
      ...command,
      idempotencyKey: crypto.randomUUID(),
    });
    await transfers.transfer(actor.id, settlement);
    expect(
      (await operations.get(operation.operationId, actor.id)).consents.map((entry) => entry.status),
    ).toEqual(['REVOKED', 'STALE', 'CONSUMED']);
  });
  it('allows only one of two concurrent reciprocal company acquisitions and prevents an indirect ownership cycle', async () => {
    const { db, fixture } = context();
    const first = await registeredCompany();
    const second = await registeredCompany();
    const firstLot = { ...transfer(first), recipient: { type: 'COMPANY' as const, id: second.id } };
    const secondLot = {
      ...transfer(second),
      recipient: { type: 'COMPANY' as const, id: first.id },
    };
    await prepare(firstLot);
    await prepare(secondLot);
    const decisions = new CompanyDecisionService(db);
    const actor = { id: fixture.founderId, admin: false };
    await decisions.create(second.id, actor, {
      revisionId: second.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation: firstLot },
    });
    await decisions.create(first.id, actor, {
      revisionId: first.revisionId,
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation: secondLot },
    });
    const service = new PersonalShareService(db);
    const results = await Promise.allSettled(
      [firstLot, secondLot].map(
        async (operation) =>
          await service.transfer(actor.id, {
            operation,
            authorizationDecisionId: null,
            idempotencyKey: crypto.randomUUID(),
          }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { code: 'COMPANY_OWNERSHIP_CYCLE' },
    });
  });
});
