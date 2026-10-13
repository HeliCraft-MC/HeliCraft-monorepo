// oxlint-disable max-lines-per-function, max-statements, no-await-in-loop, unicorn/no-await-expression-member -- Sequential HTTP checks share a single integration scenario and report each failing query.
import type { OpenAPIHono } from '@hono/zod-openapi';
import { HTTP } from '../src/modules/errors';
import { expect } from 'vitest';
import type { Database } from '../src/db';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { emptyConfiguration } from '../src/modules/states/domain';
import { applyPreset } from '../src/modules/states/presets';
import { StateDirectorySchema } from '../src/modules/states/directory-contracts';

const DIRECTORY_TOTAL = 3;
const SECOND_PAGE = 2;

async function assertDirectory(app: OpenAPIHono, expectedTotal: number): Promise<void> {
  const initialResponse = await app.request('/api/v1/public/states');
  expect(initialResponse.status).toBe(HTTP.ok);
  const directory = StateDirectorySchema.parse(await initialResponse.json());
  expect(directory.total).toBe(expectedTotal);
  expect(directory.items).toHaveLength(expectedTotal);
  if (expectedTotal === 0) {
    return;
  }
  expect(directory.items[0]).toMatchObject({
    slug: 'aurora',
    name: { ru: 'Аврора', en: 'Aurora' },
    citizens: 2,
    officeCount: 1,
    hasConstitution: true,
  });
  expect(JSON.stringify(directory)).not.toContain('Rights');
  for (const query of [
    'search=aurora',
    'search=%D0%B0%D0%B2%D1%80%D0%BE%D1%80%D0%B0',
    'constitution=YES',
    'entryMode=BY_APPLICATION',
    'sort=NAME&locale=en',
    'sort=POPULATION',
    'page=999&pageSize=1',
  ]) {
    const response = await app.request(`/api/v1/public/states?${query}`);
    expect(response.status, query).toBe(HTTP.ok);
    const result = StateDirectorySchema.parse(await response.json());
    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe('aurora');
    expect(result.page).toBe(1);
  }
  for (const query of [
    'search=missing',
    'search=%25',
    'search=%5F',
    'constitution=NO',
    'entryMode=OPEN',
    'entryMode=BY_INVITATION',
  ]) {
    const response = await app.request(`/api/v1/public/states?${query}`);
    expect(response.status, query).toBe(HTTP.ok);
    const result = StateDirectorySchema.parse(await response.json());
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  }
  for (const query of ['page=0', 'pageSize=1000', 'sort=UNKNOWN', 'entryMode=CREATED']) {
    expect((await app.request(`/api/v1/public/states?${query}`)).status).toBe(HTTP.badRequest);
  }
}
async function assertDirectoryOrdering(
  db: Database['db'],
  app: OpenAPIHono,
  actors: Readonly<{ ownerId: string; adminId: string }>,
): Promise<void> {
  const drafts = new StateDraftService(db);
  const service = new StateService(db);
  const extraIds: string[] = [];
  for (const slug of ['beta', 'zulu']) {
    const draft = await drafts.create(actors.ownerId, slug);
    const saved = await drafts.save(draft.id, actors.ownerId, {
      version: draft.version,
      title: slug,
      step: 12,
      configuration: {
        ...emptyConfiguration(),
        slug,
        name: { en: slug === 'beta' ? 'Beta' : 'Zulu' },
        description: { en: slug === 'beta' ? 'Harbor with 100% _identity' : 'Harbor community' },
        citizenship: {
          entryMode: slug === 'beta' ? 'OPEN' : 'BY_INVITATION',
          allowMultipleCitizenships: true,
        },
        governance: applyPreset('AUTOCRACY', actors.ownerId),
      },
    });
    const id = await service.submit(draft.id, actors.ownerId, saved.version);
    await service.changeStatus(id, actors.adminId, {
      status: 'ACTIVE',
      reason: 'Directory fixture reviewed',
    });
    extraIds.push(id);
  }
  const names = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?sort=NAME&locale=en')).json(),
  );
  expect(names.items.map((item) => item.slug)).toStrictEqual(['aurora', 'beta', 'zulu']);
  const newest = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?pageSize=1&page=2')).json(),
  );
  expect(newest.total).toBe(DIRECTORY_TOTAL);
  expect(newest.page).toBe(SECOND_PAGE);
  expect(newest.items.map((item) => item.slug)).toStrictEqual(['beta']);
  const largest = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?sort=POPULATION&pageSize=1')).json(),
  );
  expect(largest.items[0]?.slug).toBe('aurora');
  const harbor = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?search=harbor&constitution=NO')).json(),
  );
  expect(harbor.total).toBe(extraIds.length);
  const literal = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?search=%25%20%5F')).json(),
  );
  expect(literal.items.map((item) => item.slug)).toStrictEqual(['beta']);
  const open = StateDirectorySchema.parse(
    await (await app.request('/api/v1/public/states?search=harbor&entryMode=OPEN')).json(),
  );
  expect(open.items.map((item) => item.slug)).toStrictEqual(['beta']);
  for (const id of extraIds) {
    await service.changeStatus(id, actors.adminId, {
      status: 'SUSPENDED',
      reason: 'Exclude test fixtures from the remaining lifecycle checks',
    });
  }
}
export { assertDirectory, assertDirectoryOrdering };
