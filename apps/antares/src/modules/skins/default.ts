import sharp from 'sharp';
import { processSkin } from './process';
import type { ProcessedSkin } from './process';

// oxlint-disable no-magic-numbers -- Minecraft's 64×64 UV map and authored RGB pixel colors are fixed format data.
type Rectangle = readonly [x: number, y: number, width: number, height: number];
type Color = readonly [red: number, green: number, blue: number];
function paint(pixels: Buffer, rectangle: Rectangle, color: Color): void {
  const [left, top, width, height] = rectangle;
  const [red, green, blue] = color;
  for (let row = top; row < top + height; row += 1) {
    for (let column = left; column < left + width; column += 1) {
      const offset = (row * 64 + column) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
}
async function makeDefault(): Promise<ProcessedSkin> {
  const pixels = Buffer.alloc(64 * 64 * 4);
  // Original HeliCraft explorer texture; no downloaded Minecraft character assets.
  paint(pixels, [0, 0, 32, 16], [86, 58, 39]);
  paint(pixels, [8, 8, 8, 8], [194, 143, 99]);
  paint(pixels, [8, 8, 8, 2], [86, 58, 39]);
  paint(pixels, [9, 11, 2, 1], [37, 43, 43]);
  paint(pixels, [13, 11, 2, 1], [37, 43, 43]);
  paint(pixels, [11, 14, 2, 1], [123, 75, 51]);
  paint(pixels, [16, 16, 24, 16], [137, 117, 69]);
  paint(pixels, [40, 16, 16, 16], [137, 117, 69]);
  paint(pixels, [32, 48, 16, 16], [137, 117, 69]);
  paint(pixels, [0, 16, 16, 16], [70, 65, 52]);
  paint(pixels, [16, 48, 16, 16], [70, 65, 52]);
  const png = await sharp(pixels, { raw: { width: 64, height: 64, channels: 4 } })
    .png()
    .toBuffer();
  return await processSkin(png);
}
// Construct once on demand, sharing exactly the same normalization and avatar compositor.
let cached: Promise<ProcessedSkin> | null = null;
async function defaultSkin(): Promise<ProcessedSkin> {
  cached ??= makeDefault();
  return await cached;
}
export { defaultSkin };
