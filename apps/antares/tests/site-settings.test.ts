import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { SiteSettingsInput } from '../src/modules/site-settings/contracts';
import { normalizeLogo } from '../src/modules/site-settings/logo';
import { permissionsFor } from '../src/modules/permissions/policy';

describe('site settings boundaries', () => {
  it('restricts identity settings to administrators and validates addresses and source links', () => {
    expect(permissionsFor(['ADMIN'])).toContain('site.manage');
    expect(permissionsFor(['OWNER'])).toContain('site.manage');
    expect(permissionsFor(['PLAYER', 'EDITOR', 'MODERATOR'])).not.toContain('site.manage');
    const input = {
      serverName: 'Aurora',
      minecraftAddress: 'play.example.com:25565',
      githubUrl: 'https://github.com/example/server',
    };
    expect(SiteSettingsInput.safeParse(input).success).toBe(true);
    expect(
      // oxlint-disable-next-line no-script-url -- A malicious URL fixture verifies rejection before persistence.
      SiteSettingsInput.safeParse({ ...input, githubUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      SiteSettingsInput.safeParse({ ...input, githubUrl: 'https://github.com.evil.test' }).success,
    ).toBe(false);
    expect(
      SiteSettingsInput.safeParse({ ...input, minecraftAddress: 'https://example.com/path' })
        .success,
    ).toBe(false);
    expect(SiteSettingsInput.safeParse({ ...input, serverName: ' ' }).success).toBe(false);
  });
  it('normalizes raster logos and rejects executable, corrupt and oversized images', async () => {
    const image = await sharp({
      create: { width: 1024, height: 512, channels: 4, background: '#559966' },
    })
      .png()
      .toBuffer();
    const result = await normalizeLogo(image);
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    await expect(
      normalizeLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).rejects.toThrow('PNG');
    await expect(normalizeLogo(Buffer.from('broken'))).rejects.toThrow('PNG');
    await expect(normalizeLogo(Buffer.alloc(2_097_153))).rejects.toThrow('2 МиБ');
  });
});
