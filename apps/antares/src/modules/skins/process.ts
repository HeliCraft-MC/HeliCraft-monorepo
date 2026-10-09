// oxlint-disable no-magic-numbers -- PNG signature bytes, Minecraft UV coordinates and alpha thresholds are fixed format data.
import sharp from 'sharp';
import { HTTP, DomainError } from '../errors';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const SKIN_WIDTH = 64;
const LEGACY_HEIGHT = 32;
const CHANNELS = 4;
const FACE_SIZE = 8;
const AVATAR_SIZE = 128;
const OPAQUE = 255;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
interface ProcessedSkin {
  readonly png: Buffer;
  readonly avatar: Buffer;
  readonly legacy: boolean;
}
interface CopyRegion {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly width: number;
  readonly height: number;
}
// Mirror the original right limbs into the separate left-limb UV regions; never stretch legacy PNGs.
const legacyRegions: readonly CopyRegion[] = [
  { sourceX: 4, sourceY: 16, targetX: 20, targetY: 48, width: 4, height: 4 },
  { sourceX: 8, sourceY: 16, targetX: 24, targetY: 48, width: 4, height: 4 },
  { sourceX: 0, sourceY: 20, targetX: 24, targetY: 52, width: 4, height: 12 },
  { sourceX: 4, sourceY: 20, targetX: 20, targetY: 52, width: 4, height: 12 },
  { sourceX: 8, sourceY: 20, targetX: 16, targetY: 52, width: 4, height: 12 },
  { sourceX: 12, sourceY: 20, targetX: 28, targetY: 52, width: 4, height: 12 },
  { sourceX: 44, sourceY: 16, targetX: 36, targetY: 48, width: 4, height: 4 },
  { sourceX: 48, sourceY: 16, targetX: 40, targetY: 48, width: 4, height: 4 },
  { sourceX: 40, sourceY: 20, targetX: 40, targetY: 52, width: 4, height: 12 },
  { sourceX: 44, sourceY: 20, targetX: 36, targetY: 52, width: 4, height: 12 },
  { sourceX: 48, sourceY: 20, targetX: 32, targetY: 52, width: 4, height: 12 },
  { sourceX: 52, sourceY: 20, targetX: 44, targetY: 52, width: 4, height: 12 },
];
function mirrorRegion(source: Buffer, target: Buffer, region: CopyRegion): void {
  for (let row = 0; row < region.height; row += 1) {
    for (let column = 0; column < region.width; column += 1) {
      const sourceOffset =
        ((region.sourceY + row) * SKIN_WIDTH + region.sourceX + region.width - column - 1) *
        CHANNELS;
      const targetOffset =
        ((region.targetY + row) * SKIN_WIDTH + region.targetX + column) * CHANNELS;
      source.copy(target, targetOffset, sourceOffset, sourceOffset + CHANNELS);
    }
  }
}
function setAlpha(
  pixels: Buffer,
  region: Readonly<{ left: number; top: number; width: number; height: number }>,
  alpha: number,
): void {
  const { left, top, width, height } = region;
  for (let row = top; row < top + height; row += 1) {
    for (let column = left; column < left + width; column += 1) {
      pixels[(row * SKIN_WIDTH + column) * CHANNELS + CHANNELS - 1] = alpha;
    }
  }
}
function normalizePixels(source: Buffer, legacy: boolean): Buffer {
  const pixels = Buffer.alloc(SKIN_WIDTH * SKIN_WIDTH * CHANNELS);
  source.copy(pixels);
  if (legacy) {
    for (const region of legacyRegions) {
      mirrorRegion(source, pixels, region);
    }
    let hasTransparency = false;
    for (let row = 0; row < LEGACY_HEIGHT; row += 1) {
      for (let column = LEGACY_HEIGHT; column < SKIN_WIDTH; column += 1) {
        if ((pixels[(row * SKIN_WIDTH + column) * CHANNELS + CHANNELS - 1] ?? 0) < 128) {
          hasTransparency = true;
        }
      }
    }
    if (!hasTransparency) {
      setAlpha(
        pixels,
        { left: LEGACY_HEIGHT, top: 0, width: LEGACY_HEIGHT, height: LEGACY_HEIGHT },
        0,
      );
    }
  }
  setAlpha(pixels, { left: 0, top: 0, width: 32, height: 16 }, OPAQUE);
  setAlpha(pixels, { left: 0, top: 16, width: 64, height: 16 }, OPAQUE);
  setAlpha(pixels, { left: 16, top: 48, width: 32, height: 16 }, OPAQUE);
  return pixels;
}
async function renderAvatar(png: Buffer): Promise<Buffer> {
  const [base, overlay] = await Promise.all([
    sharp(png).extract({ left: 8, top: 8, width: FACE_SIZE, height: FACE_SIZE }).png().toBuffer(),
    sharp(png).extract({ left: 40, top: 8, width: FACE_SIZE, height: FACE_SIZE }).png().toBuffer(),
  ]);
  // Composite at native resolution before enlarging, preserving the outer layer's alpha.
  const composed = await sharp(base)
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
  return await sharp(composed)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
}
async function processSkin(input: Buffer): Promise<ProcessedSkin> {
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new DomainError(HTTP.tooLarge, 'SKIN_TOO_LARGE', 'Максимальный размер скина — 2 МиБ');
  }
  if (!input.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new DomainError(HTTP.badRequest, 'INVALID_SKIN', 'Загрузите PNG-скин');
  }
  try {
    const image = sharp(input, {
      limitInputPixels: SKIN_WIDTH * SKIN_WIDTH,
      failOn: 'warning',
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      metadata.width !== SKIN_WIDTH ||
      ![SKIN_WIDTH, LEGACY_HEIGHT].includes(metadata.height ?? 0) ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new DomainError(
        HTTP.badRequest,
        'INVALID_SKIN',
        'Размер скина должен быть 64×64 или 64×32',
      );
    }
    const legacy = metadata.height === LEGACY_HEIGHT;
    const source = await image.toColourspace('srgb').ensureAlpha().raw().toBuffer();
    const png = await sharp(normalizePixels(source, legacy), {
      raw: { width: SKIN_WIDTH, height: SKIN_WIDTH, channels: CHANNELS },
    })
      .png()
      .toBuffer();
    return { png, avatar: await renderAvatar(png), legacy };
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw new DomainError(HTTP.badRequest, 'INVALID_SKIN', 'PNG повреждён или не поддерживается');
  }
}

export { processSkin, renderAvatar, MAX_UPLOAD_BYTES, type ProcessedSkin };
