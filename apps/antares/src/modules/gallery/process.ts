import sharp from 'sharp';
import { DomainError, HTTP } from '../errors';

const MAX_GALLERY_BYTES = 10_485_760;
const MAX_PIXELS = 24_000_000;
const DISPLAY_WIDTH = 2560;
const THUMB_WIDTH = 800;
const WEBP_QUALITY = 85;
interface GalleryImage {
  readonly image: Buffer;
  readonly thumbnail: Buffer;
  readonly width: number;
  readonly height: number;
}
async function processGalleryImage(input: Buffer): Promise<GalleryImage> {
  if (input.length > MAX_GALLERY_BYTES) {
    throw new DomainError(HTTP.tooLarge, 'IMAGE_TOO_LARGE', 'Максимальный размер — 10 МиБ');
  }
  try {
    const decoder = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
    const metadata = await decoder.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1) {
      throw new Error('Unsupported image');
    }
    // Decode, orient and re-encode; EXIF and other uploaded metadata never leave Antares.
    const { data: image, info } = await decoder
      .rotate()
      .resize({
        width: DISPLAY_WIDTH,
        height: DISPLAY_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(image)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { image, thumbnail, width: info.width, height: info.height };
  } catch {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_IMAGE',
      'Загрузите неповреждённое статичное изображение PNG, JPEG или WebP (до 24 Мп)',
    );
  }
}
export { processGalleryImage, MAX_GALLERY_BYTES, type GalleryImage };
