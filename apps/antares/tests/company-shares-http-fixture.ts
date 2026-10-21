import { expect } from 'vitest';
import type { createApp } from '../src/app';
import { HTTP } from '../src/modules/errors';
import type { ShareTransfer } from '../src/modules/companies/ownership-contracts';
import {
  ShareOperationViewSchema,
  SharePortfolioSchema,
  ShareHistorySchema,
} from '../src/modules/companies/share-read-contracts';

interface ShareHttpContext {
  readonly operation: ShareTransfer;
  readonly ownerToken: string;
  readonly recipientToken: string;
  readonly outsiderToken: string;
  readonly origin: string;
}
const BASE = '/api/v1/account';
const HASH_LENGTH = 64;
function request(input: ShareHttpContext, token: string, body?: unknown): RequestInit {
  return {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Origin: input.origin,
      Cookie: `helicraft_session=${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
async function expectStatus(
  response: Promise<Response> | Response,
  expected: number,
): Promise<void> {
  const result = await response;
  expect(result.status).toBe(expected);
}
async function responseBody(response: Promise<Response> | Response): Promise<unknown> {
  const result = await response;
  return await result.json();
}
async function assertHistory(
  app: ReturnType<typeof createApp>,
  input: ShareHttpContext,
): Promise<void> {
  const path = `${BASE}/companies/${input.operation.issuerId}/share-history`;
  await expectStatus(app.request(path, request(input, input.outsiderToken)), HTTP.notFound);
  const history = ShareHistorySchema.parse(
    await responseBody(app.request(path, request(input, input.recipientToken))),
  );
  expect(history.items).toMatchObject([
    { kind: 'TRANSFER', operation: input.operation },
    { kind: 'INITIAL' },
  ]);
}
async function assertConsentBoundary(
  app: ReturnType<typeof createApp>,
  input: ShareHttpContext,
  termsHash: string,
): Promise<void> {
  const { operation, ownerToken, recipientToken } = input;
  const consent = {
    operationId: operation.operationId,
    termsHash,
    idempotencyKey: crypto.randomUUID(),
  };
  await expectStatus(
    app.request(`${BASE}/share-consents`, request(input, ownerToken, consent)),
    HTTP.forbidden,
  );
  await expectStatus(
    app.request(
      `${BASE}/share-consents`,
      request(input, recipientToken, { ...consent, termsHash: '0'.repeat(HASH_LENGTH) }),
    ),
    HTTP.conflict,
  );
  await expectStatus(
    app.request(
      `${BASE}/share-consents`,
      request(input, recipientToken, { ...consent, actorId: operation.owner.id }),
    ),
    HTTP.badRequest,
  );
  const forbidden = request(input, recipientToken, consent);
  forbidden.headers = {
    Origin: 'https://other.test',
    Cookie: `helicraft_session=${recipientToken}`,
    'Content-Type': 'application/json',
  };
  await expectStatus(app.request(`${BASE}/share-consents`, forbidden), HTTP.forbidden);
  await expectStatus(
    app.request(`${BASE}/share-consents`, request(input, recipientToken, consent)),
    HTTP.ok,
  );
}
// oxlint-disable-next-line max-lines-per-function -- The authenticated journey verifies protected terms, actual receiving identity, atomic settlement and exact portfolio effects.
async function assertShareHttp(
  app: ReturnType<typeof createApp>,
  input: ShareHttpContext,
): Promise<void> {
  const { operation, ownerToken, recipientToken, outsiderToken } = input;
  const operationPath = `${BASE}/share-operations/${operation.operationId}`;
  await expectStatus(app.request(`${BASE}/shares`), HTTP.unauthenticated);
  await expectStatus(
    app.request(
      `${BASE}/share-operations`,
      request(input, ownerToken, { operation, idempotencyKey: crypto.randomUUID() }),
    ),
    HTTP.ok,
  );
  await expectStatus(app.request(operationPath, request(input, outsiderToken)), HTTP.notFound);
  const response = await app.request(operationPath, request(input, recipientToken));
  expect(response.status).toBe(HTTP.ok);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const terms = ShareOperationViewSchema.parse(await response.json());
  const command = { operation, authorizationDecisionId: null, idempotencyKey: crypto.randomUUID() };
  await expectStatus(
    app.request(`${BASE}/share-transfers`, request(input, ownerToken, command)),
    HTTP.conflict,
  );
  await assertConsentBoundary(app, input, terms.termsHash);
  await expectStatus(
    app.request(`${BASE}/share-transfers`, request(input, recipientToken, command)),
    HTTP.forbidden,
  );
  await expectStatus(
    app.request(`${BASE}/share-transfers`, request(input, ownerToken, command)),
    HTTP.ok,
  );
  await expectStatus(
    app.request(`${BASE}/share-transfers`, request(input, ownerToken, command)),
    HTTP.ok,
  );
  const completed = ShareOperationViewSchema.parse(
    await responseBody(app.request(operationPath, request(input, recipientToken))),
  );
  expect(completed).toMatchObject({
    eventId: operation.operationId,
    consents: [{ status: 'CONSUMED' }],
  });
  const portfolio = SharePortfolioSchema.parse(
    await responseBody(app.request(`${BASE}/shares`, request(input, recipientToken))),
  );
  expect(portfolio.items.find((item) => item.issuerId === operation.issuerId)).toMatchObject({
    shares: operation.shares,
    issuedShares: '37',
    controls: false,
  });
  await assertHistory(app, input);
}
export { assertShareHttp };
