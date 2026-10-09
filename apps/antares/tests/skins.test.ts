import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processSkin, MAX_UPLOAD_BYTES } from '../src/modules/skins/process';

async function fixture(name: string): Promise<Buffer> {
  return await readFile(new URL(`fixtures/${name}`, import.meta.url));
}
async function pixel(image: Buffer, left: number, top: number): Promise<number[]> {
  const value = await sharp(image)
    .extract({ left, top, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return [...value];
}
describe('skin normalization and avatar rendering', () => {
  it('composes opaque and semi-transparent hat pixels over the face before nearest scaling', async () => {
    const processed = await processSkin(await fixture('modern-overlay.png'));
    expect(processed.legacy).toBe(false);
    const size = await sharp(processed.png).metadata();
    expect([size.width, size.height]).toStrictEqual([64, 64]);
    expect(await pixel(processed.avatar, 0, 0)).toStrictEqual([20, 40, 200, 255]);
    expect(await pixel(processed.avatar, 120, 0)).toStrictEqual([200, 100, 50, 255]);
    const translucent = await pixel(processed.avatar, 70, 0);
    expect(translucent[0]).toBeGreaterThanOrEqual(108);
    expect(translucent[0]).toBeLessThanOrEqual(110);
    expect(translucent[2]).toBeGreaterThanOrEqual(124);
    expect(translucent[2]).toBeLessThanOrEqual(126);
  });
  it('mirrors legacy limb UVs into a modern skin without stretching', async () => {
    const processed = await processSkin(await fixture('legacy-overlay.png'));
    expect(processed.legacy).toBe(true);
    expect(await pixel(processed.png, 20, 52)).toStrictEqual([10, 250, 20, 255]);
    expect(await pixel(processed.png, 23, 52)).toStrictEqual([250, 10, 20, 255]);
    expect(await pixel(processed.avatar, 0, 0)).toStrictEqual([20, 40, 200, 255]);
  });
  it('rejects non-PNG, malformed PNG, invalid dimensions and oversized data', async () => {
    await expect(processSkin(Buffer.from('not png'))).rejects.toThrow('Загрузите PNG');
    const input = await fixture('modern-overlay.png');
    await expect(processSkin(input.subarray(0, 30))).rejects.toThrow('PNG');
    await expect(processSkin(await fixture('invalid-size.png'))).rejects.toThrow('Размер скина');
    await expect(processSkin(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toThrow(
      'Максимальный размер',
    );
  });
});
