import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processGalleryImage, MAX_GALLERY_BYTES } from '../src/modules/gallery/process';
import { createApp } from '../src/app';
import { GalleryMetadataSchema } from '../src/modules/gallery/contracts';

const app = createApp({
  checkReady: async () => {
    await Promise.resolve();
  },
});
describe('gallery validation', () => {
  it('rejects disguised files and excessive bytes', async () => {
    await expect(processGalleryImage(Buffer.from('<svg/>'))).rejects.toThrow('неповреждённое');
    await expect(processGalleryImage(Buffer.alloc(MAX_GALLERY_BYTES + 1))).rejects.toThrow(
      '10 МиБ',
    );
  });
  it('normalizes real JPEG into bounded WebP and strips uploaded metadata', async () => {
    const original = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: '#224433' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const image = await processGalleryImage(original);
    expect(image.width).toBe(2560);
    const metadata = await sharp(image.image).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
    const thumbnail = await sharp(image.thumbnail).metadata();
    expect(thumbnail.width).toBe(800);
  });
  it('rejects invalid metadata rather than accepting owner IDs from the request', () => {
    expect(GalleryMetadataSchema.safeParse({ title: '', alt: 'view' }).success).toBe(false);
    expect(
      GalleryMetadataSchema.safeParse({ title: 'View', alt: 'view', players: ['mutable-name'] })
        .success,
    ).toBe(false);
  });
  it('rejects an anonymous upload using the existing session boundary', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array([0])], 'invalid.png'));
    form.set('metadata', JSON.stringify({ title: 'Test', alt: 'Image' }));
    const response = await app.request('/api/v1/account/gallery', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: form,
    });
    expect(response.status).toBe(401);
  });
  it('returns a recoverable unavailable response without persistence', async () => {
    const response = await app.request('/api/v1/public/gallery');
    expect(response.status).toBe(503);
  });
  it('requires authentication for player search and validates username prefixes', async () => {
    const anonymous = await app.request('/api/v1/account/gallery/players?query=Player');
    const short = await app.request('/api/v1/account/gallery/players?query=P');
    const wildcard = await app.request('/api/v1/account/gallery/players?query=%25%25');
    expect(anonymous.status).toBe(401);
    expect(short.status).toBe(400);
    expect(wildcard.status).toBe(400);
  });
});
