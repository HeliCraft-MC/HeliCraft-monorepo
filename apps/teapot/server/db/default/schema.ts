// Default database schema (AUTH table)
// Source: .dev/dbs/newAuth.sql

import {
    bigint,
    char,
    index,
    mysqlTable,
    tinyint,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/mysql-core';

// AUTH table - user authentication
export const auth = mysqlTable('AUTH', {
    nickname: varchar('NICKNAME', { length: 255 }).notNull(),
    lowercaseNickname: varchar('LOWERCASENICKNAME', { length: 255 }).notNull().primaryKey(),
    hash: varchar('HASH', { length: 255 }).notNull(),
    ip: varchar('IP', { length: 255 }),
    isAdmin: tinyint('isAdmin').notNull().default(0),
    totpToken: varchar('TOTPTOKEN', { length: 255 }),
    regDate: bigint('REGDATE', { mode: 'number' }),
    uuid: varchar('UUID', { length: 255 }),
    uuidWr: varchar('UUID_WR', { length: 255 }),
    premiumUuid: varchar('PREMIUMUUID', { length: 255 }),
    loginIp: varchar('LOGINIP', { length: 255 }),
    loginDate: bigint('LOGINDATE', { mode: 'number' }),
    issuedTime: bigint('ISSUEDTIME', { mode: 'number' }),
    accessToken: char('accessToken', { length: 32 }),
    serverId: varchar('serverID', { length: 41 }),
    hwidId: bigint('hwidId', { mode: 'number' }),
}, table => [
    uniqueIndex('UUID_WR').on(table.uuidWr),
    index('AUTH_PREMIUMUUID_idx').on(table.premiumUuid),
    index('AUTH_IP_idx').on(table.ip),
]);

// Type exports for usage in application code
export type Auth = typeof auth.$inferSelect;
export type NewAuth = typeof auth.$inferInsert;
