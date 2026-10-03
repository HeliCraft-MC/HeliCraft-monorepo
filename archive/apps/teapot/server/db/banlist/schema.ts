// Banlist database schema (LiteBans)
// Source: .dev/dbs/litebans_bans.sql

import { sql } from 'drizzle-orm';
import {
    bigint,
    index,
    mysqlTable,
    tinyint,
    varchar,
} from 'drizzle-orm/mysql-core';

// LiteBans bans table
export const litebansBans = mysqlTable('litebans_bans', {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    uuid: varchar('uuid', { length: 36 }),
    ip: varchar('ip', { length: 45 }),
    reason: varchar('reason', { length: 2048 }),
    bannedByUuid: varchar('banned_by_uuid', { length: 36 }).notNull(),
    bannedByName: varchar('banned_by_name', { length: 128 }),
    removedByUuid: varchar('removed_by_uuid', { length: 36 }),
    removedByName: varchar('removed_by_name', { length: 128 }),
    removedByReason: varchar('removed_by_reason', { length: 2048 }),
    removedByDate: bigint('removed_by_date', { mode: 'number' }).notNull().default(sql`(CURRENT_TIMESTAMP)`),
    time: bigint('time', { mode: 'number' }).notNull(),
    until: bigint('until', { mode: 'number' }).notNull(),
    template: tinyint('template', { unsigned: true }).notNull().default(255),
    serverScope: varchar('server_scope', { length: 32 }),
    serverOrigin: varchar('server_origin', { length: 32 }),
    // bit fields stored as boolean (0/1)
    silent: tinyint('silent').notNull().default(0),
    ipban: tinyint('ipban').notNull().default(0),
    ipbanWildcard: tinyint('ipban_wildcard').notNull().default(0),
    active: tinyint('active').notNull().default(1),
}, table => [
    index('idx_litebans_bans_uuid').on(table.uuid),
    index('idx_litebans_bans_ip').on(table.ip),
    index('idx_litebans_bans_banned_by_uuid').on(table.bannedByUuid),
    index('idx_litebans_bans_time').on(table.time),
    index('idx_litebans_bans_until').on(table.until),
    index('idx_litebans_bans_template').on(table.template),
    index('idx_litebans_bans_ipban').on(table.ipban),
    index('idx_litebans_bans_ipban_wildcard').on(table.ipbanWildcard),
    index('idx_litebans_bans_active').on(table.active),
]);

// Type exports
export type LitebansBan = typeof litebansBans.$inferSelect;
export type NewLitebansBan = typeof litebansBans.$inferInsert;
