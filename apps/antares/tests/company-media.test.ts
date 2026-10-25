import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processCompanyImage } from '../src/modules/companies/media';

describe('company media processing', () => {
  it('crops logos to a square and encodes actual raster images as WebP', async () => {
    const bytes = await sharp({
      create: { width: 900, height: 300, channels: 3, background: '#338899' },
    })
      .png()
      .toBuffer();
    const file = new File([bytes], 'image.png', { type: 'image/png' });
    const logo = await processCompanyImage(file, 'LOGO');
    expect(logo.width).toBe(512);
    expect(logo.height).toBe(512);
    const metadata = await sharp(logo.image).metadata();
    expect(metadata.format).toBe('webp');
    const cover = await processCompanyImage(file, 'COVER');
    expect(cover.width).toBe(900);
    expect(cover.height).toBe(300);
  });
  it('rejects unsupported content, forged image MIME types and oversized files', async () => {
    await expect(
      processCompanyImage(new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' }), 'LOGO'),
    ).rejects.toMatchObject({ code: 'COMPANY_IMAGE_FORMAT' });
    await expect(
      processCompanyImage(new File(['not an image'], 'logo.png', { type: 'image/png' }), 'LOGO'),
    ).rejects.toMatchObject({ code: 'COMPANY_IMAGE_INVALID' });
    await expect(
      processCompanyImage(
        new File([new Uint8Array(10_000_001)], 'large.png', { type: 'image/png' }),
        'COVER',
      ),
    ).rejects.toMatchObject({ code: 'COMPANY_IMAGE_TOO_LARGE' });
  });
});
