import type { OpenAPIHono } from '@hono/zod-openapi';
import { HTTP } from '../src/modules/errors';
import { expect } from 'vitest';
import { PublicPlayerProfileSchema } from '../src/modules/players/profile-contracts';

async function assertPublicProfile(
  app: OpenAPIHono,
  id: string,
  expected: Readonly<{ name: string; stateVisible: boolean; office?: string }>,
): Promise<void> {
  const response = await app.request(`/api/v1/public/players/${id}`);
  expect(response.status).toBe(HTTP.ok);
  const json: unknown = await response.json();
  const profile = PublicPlayerProfileSchema.strict().parse(json);
  expect(profile.name).toBe(expected.name);
  const state = profile.states.find((item) => item.slug === 'aurora');
  expect(state !== undefined).toBe(expected.stateVisible);
  expect(profile.states.some((item) => item.slug === 'rejected-candidate')).toBe(false);
  if (expected.stateVisible) {
    expect(state?.name.en).toBe('Aurora');
    expect(state?.name.ru).toBe('Аврора');
    expect(state?.founder).toBe(true);
    expect(state?.citizenSince).not.toBeNull();
  }
  if (expected.office !== undefined) {
    expect(state?.offices[0]?.name.en).toBe(expected.office);
  }
  const unknown = await app.request(`/api/v1/public/players/${crypto.randomUUID()}`);
  const invalid = await app.request('/api/v1/public/players/invalid');
  expect(unknown.status).toBe(HTTP.notFound);
  expect(invalid.status).toBe(HTTP.badRequest);
}
export { assertPublicProfile };
