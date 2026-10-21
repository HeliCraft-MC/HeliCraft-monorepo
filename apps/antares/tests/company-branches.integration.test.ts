// oxlint-disable import/max-dependencies -- Branch scenarios exercise the real company/state Governance, public/protected API and PostgreSQL source/history constraints.
// oxlint-disable max-lines -- Independent legal-presence lifecycles share two real states and one disposable migrated database.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  companies,
  legalSubjects,
  financialAccounts,
  companyBranches,
  companyBranchApplications,
  companyBranchEvents,
} from '../src/db/schema';
import { createApp } from '../src/app';
import { SessionService } from '../src/modules/sessions/service';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { CompanyBranchService } from '../src/modules/companies/branches';
import { PublicCompanyBranchService } from '../src/modules/companies/branch-public';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import type { CompanyDecisionPayload } from '../src/modules/companies/decision-contracts';
import type { CompanyRegistrationPolicy } from '../src/modules/companies/contracts';
import type { BranchRegistration } from '../src/modules/companies/branch-contracts';
import {
  BranchDetailSchema,
  PublishedBranchListSchema,
  PublishedRegistrationPolicySchema,
} from '../src/modules/companies/branch-read-contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority } from './taxation-fixture';
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
let host: StateFixture | null = null;
function context(): { db: Database['db']; home: StateFixture; host: StateFixture } {
  if (!database || !home || !host) {
    throw new Error('Branch fixture unavailable');
  }
  return { db: database.db, home, host };
}
async function policy(state: StateFixture, input: CompanyRegistrationPolicy): Promise<string> {
  const { db } = context();
  const reader = new PublicCompanyBranchService(db);
  const previous = await reader.policy(state.stateId);
  await new MonetaryDirectiveService(db).create(
    state.stateId,
    { id: state.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'SET_COMPANY_REGISTRATION_POLICY',
        baseRevisionId: previous?.id ?? null,
        policy: input,
      },
    },
  );
  const current = await reader.policy(state.stateId);
  if (current === null) {
    throw new Error('Registration policy missing');
  }
  return current.id;
}
async function company(): Promise<string> {
  const fixture = context();
  const draft = await prepareCompany(fixture.db, {
    applicantId: fixture.home.founderId,
    configuration: officeCompanyConfiguration(fixture.home.founderId, fixture.home.stateId),
  });
  await submitPreparedCompany(fixture.db, draft);
  return draft.companyId;
}
async function propose(
  companyId: string,
  payload: CompanyDecisionPayload,
  key: string = crypto.randomUUID(),
): Promise<string> {
  const { db, home: owner } = context();
  const [current] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (current?.currentRevisionId === null || current?.currentRevisionId === undefined) {
    throw new Error('Company charter missing');
  }
  return await new CompanyDecisionService(db).create(
    companyId,
    { id: owner.founderId, admin: false },
    { revisionId: current.currentRevisionId, idempotencyKey: key, payload },
  );
}
async function registration(branchId: string = crypto.randomUUID()): Promise<BranchRegistration> {
  const { db, host: state } = context();
  const current = await new PublicCompanyBranchService(db).policy(state.stateId);
  if (current === null) {
    throw new Error('Host policy missing');
  }
  return {
    kind: 'REGISTER_BRANCH',
    branchId,
    stateId: state.stateId,
    policyRevisionId: current.id,
    name: { ru: 'Зарубежный филиал', en: 'Foreign branch' },
    description: { en: 'The same legal company; no independent wallet' },
  };
}
async function review(
  payload: BranchRegistration,
  applicationId: string,
  decision: 'APPROVE' | 'REJECT' = 'APPROVE',
): Promise<string> {
  const { db, host: state } = context();
  return await new MonetaryDirectiveService(db).create(
    state.stateId,
    { id: state.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'REVIEW_COMPANY_BRANCH',
        branchId: payload.branchId,
        applicationId,
        decision,
        reason: 'Exact host registration review',
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
  home = await monetaryFixture(database.db, 'Bh');
  host = await monetaryFixture(database.db, 'Bf');
  await addEconomicAuthority(database.db, home);
  await addEconomicAuthority(database.db, host);
  await policy(home, { ...freeCompanyPolicy, branchMode: 'FREE' });
  await policy(host, freeCompanyPolicy);
});
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Related scenarios retain their independent consented corporate sources, host decisions and immutable branch histories.
describe('company branch registration', () => {
  it('opens foreign presence under FREE rules without citizenship, a new legal subject or branch money', async () => {
    const { db, home: owner, host: state } = context();
    await policy(state, { ...freeCompanyPolicy, branchMode: 'FREE' });
    const id = await company();
    const payload = await registration();
    const applicationId = await propose(id, payload);
    const branches = new CompanyBranchService(db);
    const actor = { id: owner.founderId, admin: false };
    const detail = await branches.detail(payload.branchId, actor);
    expect(detail).toMatchObject({
      branch: { companyId: id, stateId: state.stateId, status: 'ACTIVE', name: payload.name },
      application: { id: applicationId, status: 'APPROVED', reviewDirectiveId: null },
      history: {
        items: [{ fromStatus: null, toStatus: 'ACTIVE', companyDecisionId: applicationId }],
      },
    });
    expect(
      await db.select().from(legalSubjects).where(eq(legalSubjects.id, payload.branchId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.ownerId, payload.branchId)),
    ).toHaveLength(0);
    const published = await new PublicCompanyBranchService(db).company(id);
    expect(published.items).toMatchObject([{ id: payload.branchId, status: 'ACTIVE' }]);
    await propose(id, {
      kind: 'CLOSE_BRANCH',
      branchId: payload.branchId,
      reason: 'Presence no longer needed',
    });
    expect(
      (await branches.detail(payload.branchId, actor)).history.items.map((event) => event.toStatus),
    ).toEqual(['CLOSED', 'ACTIVE']);
    expect((await new PublicCompanyBranchService(db).company(id)).items).toMatchObject([
      { id: payload.branchId, status: 'CLOSED' },
    ]);
    await expect(propose(id, payload)).rejects.toMatchObject({ code: 'BRANCH_ALREADY_REGISTERED' });
  });
  it('requires host Governance, hides pending presence publicly, preserves rejection and reuses the same branch identity', async () => {
    const { db, home: owner, host: state } = context();
    await policy(state, freeCompanyPolicy);
    const id = await company();
    const payload = await registration();
    const first = await propose(id, payload);
    const branches = new CompanyBranchService(db);
    const actor = { id: owner.founderId, admin: false };
    expect((await new PublicCompanyBranchService(db).company(id)).items).toHaveLength(0);
    expect(
      (await branches.state(state.stateId, { id: state.citizenId, admin: false })).items.some(
        (item) => item.id === payload.branchId,
      ),
    ).toBe(true);
    await expect(
      branches.detail(payload.branchId, { id: owner.citizenId, admin: false }),
    ).rejects.toMatchObject({ code: 'COMPANY_BRANCH_NOT_FOUND' });
    await expect(
      new MonetaryDirectiveService(db).create(state.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'REVIEW_COMPANY_BRANCH',
          branchId: payload.branchId,
          applicationId: first,
          decision: 'APPROVE',
          reason: 'Foreign founder cannot act for host',
        },
      }),
    ).rejects.toMatchObject({ code: 'STATE_NOT_FOUND' });
    await review(payload, first, 'REJECT');
    const second = await propose(id, { ...payload, name: { en: 'Revised foreign presence' } });
    await expect(review(payload, first)).rejects.toMatchObject({
      code: 'BRANCH_APPLICATION_STALE',
    });
    await expect(propose(id, { ...payload, stateId: owner.stateId })).rejects.toMatchObject({
      code: 'BRANCH_POLICY_STALE',
    });
    await review(payload, second);
    expect(
      (await branches.detail(payload.branchId, actor)).history.items.map((event) => event.toStatus),
    ).toEqual(['ACTIVE', 'PENDING_REGISTRATION', 'REJECTED', 'PENDING_REGISTRATION']);
    expect(await branches.application(payload.branchId, first, actor)).toMatchObject({
      status: 'REJECTED',
      name: payload.name,
      reviewReason: 'Exact host registration review',
    });
    expect((await new PublicCompanyBranchService(db).company(id)).items).toMatchObject([
      { id: payload.branchId, name: { en: 'Revised foreign presence' } },
    ]);
  });
  it('re-pins changed host rules, supersedes an obsolete request and cancels pending presence after a charter change', async () => {
    const { db, home: owner, host: state } = context();
    await policy(state, freeCompanyPolicy);
    const id = await company();
    const payload = await registration();
    const first = await propose(id, payload);
    await policy(state, { ...freeCompanyPolicy, branchMode: 'FREE' });
    await expect(review(payload, first)).rejects.toMatchObject({ code: 'BRANCH_POLICY_STALE' });
    const fresh = await registration(payload.branchId);
    await propose(id, fresh);
    const branches = new CompanyBranchService(db);
    const actor = { id: owner.founderId, admin: false };
    expect(await branches.application(payload.branchId, first, actor)).toMatchObject({
      status: 'SUPERSEDED',
    });
    await policy(state, freeCompanyPolicy);
    const pending = await registration();
    const applicationId = await propose(id, pending);
    await propose(id, {
      kind: 'UPDATE_PROFILE',
      name: { en: 'New corporate revision' },
      description: {},
      categories: [],
    });
    await expect(review(pending, applicationId)).rejects.toMatchObject({
      code: 'BRANCH_CORPORATE_AUTHORITY_STALE',
    });
    await propose(id, {
      kind: 'CLOSE_BRANCH',
      branchId: pending.branchId,
      reason: 'Withdraw the obsolete application',
    });
    expect((await branches.detail(pending.branchId, actor)).application.status).toBe('CANCELLED');
    expect(
      (await new PublicCompanyBranchService(db).company(id)).items.some(
        (item) => item.id === pending.branchId,
      ),
    ).toBe(false);
  });
  it('serializes concurrent state outcomes and rejects history rewrites and unsupported direct head changes', async () => {
    const { db, home: owner, host: state } = context();
    await policy(state, freeCompanyPolicy);
    const id = await company();
    const payload = await registration();
    const applicationId = await propose(id, payload);
    const results = await Promise.allSettled([
      review(payload, applicationId),
      review(payload, applicationId, 'REJECT'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const detail = await new CompanyBranchService(db).detail(payload.branchId, {
      id: owner.founderId,
      admin: false,
    });
    expect(detail.history.items).toHaveLength(2);
    await expect(
      db
        .update(companyBranches)
        .set({ stateId: owner.stateId })
        .where(eq(companyBranches.id, payload.branchId)),
    ).rejects.toThrow();
    await expect(
      db
        .update(companyBranchApplications)
        .set({ reviewReason: 'Altered historical reason' })
        .where(eq(companyBranchApplications.id, applicationId)),
    ).rejects.toThrow();
    await expect(
      db.delete(companyBranchEvents).where(eq(companyBranchEvents.branchId, payload.branchId)),
    ).rejects.toThrow();
    await expect(
      db
        .update(companyBranches)
        .set({ status: 'CLOSED' })
        .where(eq(companyBranches.id, payload.branchId)),
    ).rejects.toThrow();
    await expect(
      db.insert(companyBranchEvents).values({
        branchId: payload.branchId,
        applicationId,
        fromStatus: detail.branch.status,
        toStatus: detail.branch.status,
        actorId: owner.founderId,
        companyDecisionId: applicationId,
      }),
    ).rejects.toThrow();
  });
  it('honors foreign restrictions, domestic exceptions and complete branch-registration denial', async () => {
    const { db, home: owner, host: state } = context();
    const id = await company();
    await policy(state, { ...freeCompanyPolicy, branchMode: 'FREE', foreignBranches: 'DENY' });
    const foreign = await registration();
    await expect(propose(id, foreign)).rejects.toMatchObject({
      code: 'BRANCH_REGISTRATION_RESTRICTED',
    });
    const domesticPolicyId = await policy(owner, {
      ...freeCompanyPolicy,
      branchMode: 'FREE',
      foreignBranches: 'DENY',
    });
    const domestic = {
      ...foreign,
      branchId: crypto.randomUUID(),
      stateId: owner.stateId,
      policyRevisionId: domesticPolicyId,
    };
    await propose(id, domestic);
    expect((await new PublicCompanyBranchService(db).company(id)).items).toMatchObject([
      { id: domestic.branchId, stateId: owner.stateId },
    ]);
    await policy(state, { ...freeCompanyPolicy, branchMode: 'DENY' });
    await expect(propose(id, await registration())).rejects.toMatchObject({
      code: 'BRANCH_REGISTRATION_RESTRICTED',
    });
    await policy(owner, { ...freeCompanyPolicy, branchMode: 'FREE' });
  });
  it('serves only approved normalized metadata publicly and authenticates participant application reads', async () => {
    const { db, home: owner, host: state } = context();
    await policy(state, freeCompanyPolicy);
    const id = await company();
    const payload = await registration();
    const applicationId = await propose(id, payload);
    const app = createApp({
      db,
      siteOrigin: 'https://branches.test',
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const token = await new SessionService(db).issue(owner.founderId);
    const cookie = { Cookie: `helicraft_session=${token}` };
    const path = `/api/v1/account/company-branches/${payload.branchId}`;
    expect((await app.request(path)).status).toBe(401);
    const detail = await app.request(path, { headers: cookie });
    expect(detail.status).toBe(200);
    expect(BranchDetailSchema.parse(await detail.json()).application.id).toBe(applicationId);
    const publicPath = `/api/v1/public/companies/${id}/branches`;
    const pending = await app.request(publicPath);
    expect(PublishedBranchListSchema.parse(await pending.json()).items).toHaveLength(0);
    const policyResponse = await app.request(
      `/api/v1/public/states/${state.stateId}/company-registration-policy`,
      { headers: { Cookie: 'helicraft_session=invalid' } },
    );
    expect(policyResponse.status).toBe(200);
    expect(PublishedRegistrationPolicySchema.parse(await policyResponse.json()).id).toBe(
      payload.policyRevisionId,
    );
    await review(payload, applicationId);
    const published = await app.request(publicPath);
    const text = await published.text();
    expect(text).toContain('Зарубежный филиал');
    expect(text).not.toContain('reviewReason');
    expect(text).not.toContain('approvals');
    expect(text).not.toContain('currentApplicationId');
    expect(text).not.toContain(applicationId);
    expect(PublishedBranchListSchema.parse(JSON.parse(text)).items).toHaveLength(1);
  });
});
