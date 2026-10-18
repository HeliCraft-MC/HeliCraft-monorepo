import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { siteSettings, SITE_SETTINGS_ID } from '../../db/site-schema';
import { adminAuditLog } from '../../db/schema';
import type { MediaObjects } from '../media/objects';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { defaultSettings } from './contracts';
import type { SiteDefaults } from './contracts';

const MAX_LOGO_BYTES = 2_097_152;
const MAX_LOGO_PIXELS = 4_194_304;
const LOGO_SIZE = 512;
async function normalizeLogo(bytes: Buffer): Promise<Buffer> {
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new DomainError(HTTP.tooLarge, 'LOGO_TOO_LARGE', 'Максимальный размер логотипа — 2 МиБ');
  }
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_LOGO_PIXELS, animated: true });
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1) {
      throw new Error('Invalid logo');
    }
    return await image
      .rotate()
      .resize(LOGO_SIZE, LOGO_SIZE, {
        fit: 'contain',
        background: '#00000000',
      })
      .png()
      .toBuffer();
  } catch {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_LOGO',
      'Загрузите статичное изображение PNG, JPEG или WebP до 4 мегапикселей',
    );
  }
}
async function changeLogo(
  db: Database['db'],
  resources: Readonly<{ media: MediaObjects; defaults: SiteDefaults }>,
  input: Readonly<{ actorId: string; bytes: Buffer | null }>,
): Promise<void> {
  const { media, defaults } = resources;
  const { actorId, bytes } = input;
  // Verify authority before processing or storing untrusted uploads, and again at publication.
  await db.transaction(async (transaction) => {
    await authorizeMutation(transaction, actorId, 'site.manage');
  });
  const key = bytes === null ? null : `site/logos/${crypto.randomUUID()}.png`;
  if (bytes !== null && key !== null) {
    await media.write(key, await normalizeLogo(bytes), 'image/png');
  }
  await db.transaction(async (transaction) => {
    await authorizeMutation(transaction, actorId, 'site.manage');
    await transaction
      .insert(siteSettings)
      .values({ id: SITE_SETTINGS_ID, ...defaultSettings(defaults), logoKey: key })
      .onConflictDoUpdate({
        target: siteSettings.id,
        set: { logoKey: key, updatedAt: new Date() },
      });
    await transaction.insert(adminAuditLog).values({
      actorId,
      action: 'site.logo.changed',
      targetType: 'site',
      targetId: SITE_SETTINGS_ID,
      metadata: { customLogo: key !== null },
    });
  });
}
async function readLogo(db: Database['db'], media: MediaObjects): Promise<Buffer> {
  const [record] = await db
    .select({ key: siteSettings.logoKey })
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID));
  if (record?.key === null || record?.key === undefined) {
    throw new DomainError(HTTP.notFound, 'LOGO_NOT_FOUND', 'Логотип не загружен');
  }
  return await media.read(record.key);
}
export { normalizeLogo, changeLogo, readLogo };
