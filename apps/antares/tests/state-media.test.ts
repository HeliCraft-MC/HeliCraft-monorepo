import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processFlag } from '../src/modules/states/media';

describe('horizontal flag PNG validation', () => {
  it('normalizes a real horizontal PNG and preserves dimensions', async () => {
    const image = await sharp({
      create: { width: 32, height: 16, channels: 4, background: '#3c44aa' },
    })
      .png()
      .toBuffer();
    const processed = await processFlag(image, 'image/png');
    expect(processed.width).toBe(32);
    expect(processed.height).toBe(16);
    const metadata = await sharp(processed.image).metadata();
    expect(metadata.format).toBe('png');
  });
  it('rejects mismatched MIME, forged signatures, corrupt PNGs and vertical images', async () => {
    const image = await sharp({
      create: { width: 16, height: 32, channels: 4, background: '#3c44aa' },
    })
      .png()
      .toBuffer();
    await expect(processFlag(image, 'image/jpeg')).rejects.toThrow('PNG');
    await expect(processFlag(Buffer.from('Not a PNG'), 'image/png')).rejects.toThrow('PNG');
    await expect(processFlag(image.subarray(0, 8), 'image/png')).rejects.toThrow('горизонтальный');
    await expect(processFlag(image, 'image/png')).rejects.toThrow('горизонтальный');
  });
  it('rejects oversized payloads before image decoding', async () => {
    const image = await sharp({
      create: { width: 32, height: 16, channels: 4, background: '#3c44aa' },
    })
      .png()
      .toBuffer();
    await expect(
      processFlag(Buffer.concat([image, Buffer.alloc(2_000_001)]), 'image/png'),
    ).rejects.toThrow('2 МБ');
  });
});
