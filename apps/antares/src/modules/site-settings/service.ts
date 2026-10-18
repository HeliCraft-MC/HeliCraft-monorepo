import { eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { siteSettings, SITE_SETTINGS_ID } from '../../db/site-schema';
import { adminAuditLog } from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { SiteSettingsInput, defaultSettings } from './contracts';
import type { SiteSettingsValue, SiteDefaults } from './contracts';

async function readSiteSettings(
  db: Database['db'] | undefined,
  defaults: SiteDefaults,
): Promise<SiteSettingsValue & { logoUrl: string | null }> {
  const [record] =
    db === undefined
      ? []
      : await db.select().from(siteSettings).where(eq(siteSettings.id, SITE_SETTINGS_ID));
  return record === undefined
    ? { ...defaultSettings(defaults), logoUrl: null }
    : {
        serverName: record.serverName,
        minecraftAddress: record.minecraftAddress,
        githubUrl: record.githubUrl,
        logoUrl:
          record.logoKey === null
            ? null
            : `/api/v1/public/site/logo.png?v=${encodeURIComponent(record.logoKey.replace('site/logos/', ''))}`,
      };
}
async function saveSiteSettings(
  db: Database['db'],
  actorId: string,
  raw: SiteSettingsValue,
): Promise<void> {
  const input = SiteSettingsInput.parse(raw);
  await db.transaction(async (transaction) => {
    await authorizeMutation(transaction, actorId, 'site.manage');
    await transaction
      .insert(siteSettings)
      .values({ id: SITE_SETTINGS_ID, ...input })
      .onConflictDoUpdate({
        target: siteSettings.id,
        set: { ...input, updatedAt: new Date() },
      });
    await transaction.insert(adminAuditLog).values({
      actorId,
      action: 'site.settings.changed',
      targetType: 'site',
      targetId: SITE_SETTINGS_ID,
      metadata: input,
    });
  });
}
export { readSiteSettings, saveSiteSettings };
