import { check, pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const SITE_SETTINGS_ID = '00000000-0000-4000-8000-000000000001';
const siteSettings = pgTable(
  'site_settings',
  {
    id: uuid('id').primaryKey(),
    serverName: text('server_name').notNull(),
    minecraftAddress: text('minecraft_address').notNull(),
    githubUrl: text('github_url').notNull(),
    logoKey: text('logo_key'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'site_settings_singleton',
      sql`${table.id} = '00000000-0000-4000-8000-000000000001'::uuid`,
    ),
  ],
);
export { siteSettings, SITE_SETTINGS_ID };
