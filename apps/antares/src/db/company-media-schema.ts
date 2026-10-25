import { pgTable, uuid, text, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './company-identity-schema';
import { users } from './core-schema';

const companyMedia = pgTable(
  'company_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind').$type<'LOGO' | 'COVER'>().notNull(),
    storageKey: text('storage_key').notNull().unique(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('company_media_company').on(table.companyId),
    check('company_media_kind', sql`${table.kind} in ('LOGO','COVER')`),
    check(
      'company_media_dimensions',
      sql`${table.width} > 0 and ${table.height} > 0 and (${table.kind} <> 'LOGO' or ${table.width} = ${table.height})`,
    ),
  ],
);
export { companyMedia };
