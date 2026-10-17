import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { DraftSchema } from '../../apps/antares/src/modules/states/contracts';
import { applyPreset } from '../../apps/antares/src/modules/states/presets';
import { DECISION_ACTIONS } from '../../apps/antares/src/modules/monetary/domain';
import { StateMonetarySchema } from '../../apps/antares/src/modules/monetary/contracts';
import type { DirectivePayload } from '../../apps/antares/src/modules/monetary/contracts';

function stringField(value: unknown, key: string): string {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    throw new Error('Missing response field');
  }
  const field: unknown = Reflect.get(value, key);
  if (typeof field !== 'string') {
    throw new TypeError('Invalid response field');
  }
  return field;
}
const PASSWORD = 'Browser test password 2026';
async function post(
  request: APIRequestContext,
  path: string,
  input: Readonly<{ data: unknown; origin: string }>,
): Promise<unknown> {
  const response = await request.post(`/api/v1${path}`, {
    data: input.data,
    headers: { Origin: input.origin },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json();
}
async function register(request: APIRequestContext, origin: string, name: string): Promise<string> {
  await post(request, '/auth/register', { data: { username: name, password: PASSWORD }, origin });
  const response = await request.get('/api/v1/auth/me');
  return stringField(await response.json(), 'id');
}
// oxlint-disable-next-line max-lines-per-function -- Typed fixture creates a real state with explicit optional authority and immutable submission.
async function createTaxState(
  request: APIRequestContext,
  input: Readonly<{
    origin: string;
    founderId: string;
    cofounderId: string;
    slug: string;
    name: string;
    color?: string;
  }>,
): Promise<string> {
  const draft = DraftSchema.parse(
    await post(request, '/account/state-drafts', {
      data: { title: input.name },
      origin: input.origin,
    }),
  );
  const governance = applyPreset('AUTOCRACY', input.founderId);
  const [office] = governance.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  const added = [...new Set(Object.values(DECISION_ACTIONS))].filter(
    (action) => !governance.policies.some((policy) => policy.action === action),
  );
  const response = await request.put(`/api/v1/account/state-drafts/${draft.id}`, {
    headers: { Origin: input.origin },
    data: {
      version: draft.version,
      title: input.name,
      step: 1,
      configuration: {
        ...draft.configuration,
        slug: input.slug,
        color: input.color ?? draft.configuration.color,
        name: { ru: input.name, en: `State ${input.slug}` },
        cofounderIds: [input.cofounderId],
        governance: {
          ...governance,
          policies: [
            ...governance.policies,
            ...added.map((action) => ({
              action,
              mechanism: 'SINGLE_OFFICE',
              officeIds: [office.id],
              vote: null,
              manualProcedure: {},
            })),
          ],
        },
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const saved = DraftSchema.parse(await response.json());
  return stringField(
    await post(request, `/account/state-drafts/${draft.id}/submit`, {
      data: { version: saved.version },
      origin: input.origin,
    }),
    'stateId',
  );
}
async function directive(
  request: APIRequestContext,
  input: Readonly<{ origin: string; stateId: string; payload: DirectivePayload }>,
): Promise<string> {
  const result = await post(request, `/account/states/${input.stateId}/monetary/directives`, {
    data: { idempotencyKey: crypto.randomUUID(), payload: input.payload },
    origin: input.origin,
  });
  return stringField(result, 'id');
}
// oxlint-disable-next-line max-lines-per-function -- The browser fixture funds a player through real approved bank/currency/policy/issuance decisions.
async function fundTaxWallet(
  request: APIRequestContext,
  input: Readonly<{
    origin: string;
    stateId: string;
    founderId: string;
    code: string;
    admin: APIRequestContext;
  }>,
): Promise<string> {
  const institution = await directive(request, {
    ...input,
    payload: { kind: 'ESTABLISH_BANK', name: { ru: 'Банк налогового сценария' }, description: {} },
  });
  let response = await request.get(`/api/v1/account/states/${input.stateId}/monetary`);
  const state = StateMonetarySchema.parse(await response.json());
  if (!state.bank) {
    throw new Error('Bank missing');
  }
  await post(input.admin, `/admin/central-banks/${state.bank.id}/review`, {
    origin: input.origin,
    data: {
      directiveId: institution,
      status: 'ACTIVE',
      reason: 'Browser financial fixture reviewed',
    },
  });
  await directive(request, {
    ...input,
    payload: {
      kind: 'CREATE_CURRENCY',
      code: input.code,
      name: { en: input.code },
      description: {},
    },
  });
  response = await request.get(`/api/v1/account/states/${input.stateId}/monetary`);
  const { currency } = StateMonetarySchema.parse(await response.json());
  if (!currency) {
    throw new Error('Currency missing');
  }
  await directive(request, {
    ...input,
    payload: {
      kind: 'CHANGE_POLICY',
      currencyId: currency.id,
      policy: {
        maxSupplyMinor: null,
        maxGrossIssuance30dMinor: null,
        maxIssuancePerOperationMinor: null,
      },
    },
  });
  await directive(request, {
    ...input,
    payload: {
      kind: 'ISSUE',
      currencyId: currency.id,
      amountMinor: '100000',
      purpose: 'Browser issue',
    },
  });
  await directive(request, {
    ...input,
    payload: {
      kind: 'BANK_TRANSFER',
      currencyId: currency.id,
      amountMinor: '100000',
      purpose: 'Player funds',
      recipient: { type: 'PLAYER', userId: input.founderId },
    },
  });
  return currency.id;
}
export { post, register, createTaxState, directive, fundTaxWallet, PASSWORD };
