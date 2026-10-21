import type { OpenAPIHono } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { expect } from 'vitest';
import {
  CompanyWorkspaceSchema,
  CompanyDecisionDetailSchema,
} from '../src/modules/companies/read-contracts';
import {
  CompanyLifecyclePageSchema,
  CompanyManualQueueSchema,
} from '../src/modules/companies/lifecycle-contracts';
import { PublishedCompanyProfileSchema } from '../src/modules/companies/profile-contracts';
import { HTTP } from '../src/modules/errors';

interface LifecycleActors {
  companyId: string;
  ownerToken: string;
  outsiderToken: string;
  adminToken: string;
}
type RequestInput = (method: string, token: string, body?: unknown) => RequestInit;
async function status(app: OpenAPIHono, path: string, init: RequestInit): Promise<number> {
  const response = await app.request(path, init);
  return response.status;
}
async function json(app: OpenAPIHono, path: string, init?: RequestInit): Promise<unknown> {
  const response = await app.request(path, init);
  return await response.json();
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- A real charter revision enables manual review; administration gains no general corporate proposal authority.
async function assertManualQueue(
  app: OpenAPIHono,
  input: Readonly<LifecycleActors>,
  request: RequestInput,
): Promise<void> {
  const workspacePath = `/api/v1/account/companies/${input.companyId}`;
  const queuePath = '/api/v1/admin/companies/manual-decisions';
  const workspace = CompanyWorkspaceSchema.parse(
    await json(app, workspacePath, request('GET', input.ownerToken)),
  );
  const charter = {
    ...workspace.content.charter,
    policies: workspace.content.charter.policies.map((policy) =>
      policy.action === 'UPDATE_PROFILE'
        ? {
            ...policy,
            procedure: {
              mechanism: 'MANUAL',
              officeIds: [],
              vote: null,
              manualProcedure: { en: 'Review legal identity evidence' },
            },
          }
        : policy,
    ),
  };
  expect(
    await status(
      app,
      `${workspacePath}/decisions`,
      request('POST', input.ownerToken, {
        revisionId: workspace.currentRevisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: { kind: 'AMEND_CHARTER', content: { ...workspace.content, charter } },
      }),
    ),
  ).toBe(HTTP.ok);
  const current = CompanyWorkspaceSchema.parse(
    await json(app, workspacePath, request('GET', input.ownerToken)),
  );
  const proposal = {
    revisionId: current.currentRevisionId,
    idempotencyKey: crypto.randomUUID(),
    payload: {
      kind: 'UPDATE_PROFILE',
      name: { en: 'Manually reviewed identity' },
      description: {},
      categories: [],
    },
  };
  const proposed = await app.request(
    `${workspacePath}/decisions`,
    request('POST', input.ownerToken, proposal),
  );
  expect(proposed.status).toBe(HTTP.ok);
  const { id } = z.object({ id: z.uuid() }).parse(await proposed.json());
  expect(await status(app, queuePath, request('GET', input.outsiderToken))).toBe(HTTP.forbidden);
  const queue = CompanyManualQueueSchema.parse(
    await json(app, queuePath, request('GET', input.adminToken)),
  );
  expect(queue.items.map((item) => item.id)).toContain(id);
  const decisionPath = `/api/v1/account/company-decisions/${id}`;
  expect(
    await status(
      app,
      `${decisionPath}/apply`,
      request('POST', input.ownerToken, { reason: 'I own shares' }),
    ),
  ).toBe(HTTP.conflict);
  expect(
    await status(app, `${decisionPath}/apply`, request('POST', input.adminToken, { reason: ' ' })),
  ).toBe(HTTP.conflict);
  expect(
    await status(
      app,
      `${decisionPath}/apply`,
      request('POST', input.adminToken, { reason: 'Verified the pinned manual procedure' }),
    ),
  ).toBe(HTTP.ok);
  const decision = CompanyDecisionDetailSchema.parse(
    await json(app, decisionPath, request('GET', input.adminToken)),
  );
  expect(decision).toMatchObject({
    status: 'APPLIED',
    manualReason: 'Verified the pinned manual procedure',
  });
  const completed = CompanyManualQueueSchema.parse(
    await json(app, queuePath, request('GET', input.adminToken)),
  );
  expect(completed.items.map((item) => item.id)).not.toContain(id);
}
// oxlint-disable-next-line max-statements, max-lines-per-function -- Actual HTTP moderation checks authorization, conflicting transitions, preserved ownership and immutable audit evidence in one lifecycle.
async function assertCompanyLifecycleHttp(
  app: OpenAPIHono,
  input: Readonly<LifecycleActors & { closedCompanyId: string; origin: string }>,
): Promise<void> {
  const request: RequestInput = (method, token, body) => ({
    method,
    headers: {
      Origin: input.origin,
      Cookie: `helicraft_session=${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const statusPath = `/api/v1/admin/companies/${input.companyId}/status`;
  const workspacePath = `/api/v1/account/companies/${input.companyId}`;
  const historyPath = `${workspacePath}/status-history`;
  const change = {
    previousStatus: 'ACTIVE',
    status: 'SUSPENDED',
    reason: 'Reviewed moderation cause',
  };
  expect(await status(app, statusPath, request('POST', input.ownerToken, change))).toBe(
    HTTP.forbidden,
  );
  expect(
    await status(app, statusPath, request('POST', input.adminToken, { ...change, reason: ' ' })),
  ).toBe(HTTP.badRequest);
  expect(
    await status(
      app,
      statusPath,
      request('POST', input.adminToken, { ...change, status: 'CLOSED' }),
    ),
  ).toBe(HTTP.badRequest);
  expect(
    await status(
      app,
      `/api/v1/admin/companies/${input.closedCompanyId}/status`,
      request('POST', input.adminToken, change),
    ),
  ).toBe(HTTP.conflict);
  const before = CompanyWorkspaceSchema.parse(
    await json(app, workspacePath, request('GET', input.ownerToken)),
  );
  expect(await status(app, statusPath, request('POST', input.adminToken, change))).toBe(HTTP.ok);
  const paused = CompanyWorkspaceSchema.parse(
    await json(app, workspacePath, request('GET', input.ownerToken)),
  );
  expect(paused).toMatchObject({
    id: before.id,
    currentRevisionId: before.currentRevisionId,
    shareholders: before.shareholders,
    issuedShares: before.issuedShares,
    availableActions: [],
    status: 'SUSPENDED',
  });
  const publicProfile = PublishedCompanyProfileSchema.parse(
    await json(app, `/api/v1/public/companies/${input.companyId}`),
  );
  expect(publicProfile.identity.status).toBe('SUSPENDED');
  expect(
    await status(
      app,
      `${workspacePath}/decisions`,
      request('POST', input.ownerToken, {
        revisionId: before.currentRevisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'UPDATE_PROFILE',
          name: { en: 'Unauthorized while suspended' },
          description: {},
          categories: [],
        },
      }),
    ),
  ).toBe(HTTP.conflict);
  expect(await status(app, historyPath, request('GET', input.outsiderToken))).toBe(HTTP.notFound);
  const history = CompanyLifecyclePageSchema.parse(
    await json(app, historyPath, request('GET', input.ownerToken)),
  );
  expect(history.items[0]).toMatchObject({
    previousStatus: 'ACTIVE',
    status: 'SUSPENDED',
    reason: change.reason,
  });
  const restore = {
    previousStatus: 'SUSPENDED',
    status: 'ACTIVE',
    reason: 'Reviewed restoration cause',
  };
  const responses = await Promise.all([
    app.request(statusPath, request('POST', input.adminToken, restore)),
    app.request(statusPath, request('POST', input.adminToken, restore)),
  ]);
  expect(responses.filter((response) => response.status === HTTP.ok)).toHaveLength(1);
  expect(responses.filter((response) => response.status === HTTP.conflict)).toHaveLength(1);
  const restored = CompanyWorkspaceSchema.parse(
    await json(app, workspacePath, request('GET', input.ownerToken)),
  );
  expect(restored.status).toBe('ACTIVE');
  expect(restored.currentRevisionId).toBe(before.currentRevisionId);
  await assertManualQueue(app, input, request);
}
export { assertCompanyLifecycleHttp };
