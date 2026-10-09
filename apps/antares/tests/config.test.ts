import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config';

const environment: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://fixture:fixture@localhost/helicraft',
  S3_ENDPOINT: 'http://localhost:8333',
  S3_ACCESS_KEY: 'fixture-access',
  S3_SECRET_KEY: 'fixture-secret',
};
describe('deployment security configuration', () => {
  it('rejects HTTPS with insecure cookies and accepts an explicit secure configuration', () => {
    expect(() => readConfig({ ...environment, SITE_ORIGIN: 'https://helicraft.test' })).toThrow();
    expect(
      readConfig({ ...environment, SITE_ORIGIN: 'https://helicraft.test', SECURE_COOKIES: 'true' })
        .SECURE_COOKIES,
    ).toBe(true);
  });
  it('requires the helicraft PostgreSQL database instead of silently using another target', () => {
    expect(() =>
      readConfig({ ...environment, DATABASE_URL: 'postgresql://fixture:fixture@localhost/other' }),
    ).toThrow();
  });
  it('does not advertise an empty server address when OPEN is configured', () => {
    expect(
      readConfig({ ...environment, SITE_PHASE: 'OPEN', MINECRAFT_ADDRESS: '   ' })
        .MINECRAFT_ADDRESS,
    ).toBeUndefined();
  });
  it('permits actual HTTP(S) community links and rejects unsafe protocols or malformed JSON', () => {
    const links = [{ label: 'Community', url: 'https://community.helicraft.test' }];
    expect(
      readConfig({ ...environment, COMMUNITY_LINKS: JSON.stringify(links) }).COMMUNITY_LINKS,
    ).toEqual(links);
    expect(() =>
      readConfig({
        ...environment,
        COMMUNITY_LINKS: '[{"label":"Unsafe","url":"ftp://helicraft.test"}]',
      }),
    ).toThrow();
    expect(() => readConfig({ ...environment, COMMUNITY_LINKS: '{broken' })).toThrow();
  });
});
